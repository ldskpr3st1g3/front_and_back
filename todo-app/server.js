const express = require("express");
const https = require("https");
const http = require("http");
const fs = require("fs");
const socketIo = require("socket.io");
const webpush = require("web-push");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

// ==================== VAPID КЛЮЧИ ====================
const vapidKeys = {
  publicKey:
    "BO78vbRcjLrvs2bAfbzal794I3h6AoYKiWvcZr1imzygn_qkkXFEbEa0pmS1AuWNP3cZAEGQbsiuuefER9UYLnA",
  privateKey: "yVpPkGO4YgOGRPl4puyPAOCSvtsejDj--Vxv797IyUw",
};

webpush.setVapidDetails(
  "mailto:test@example.com",
  vapidKeys.publicKey,
  vapidKeys.privateKey,
);

// ==================== EXPRESS ====================
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "./")));

// ==================== СЕРВЕР ====================
let server;

try {
  const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, "key.pem")),
    cert: fs.readFileSync(path.join(__dirname, "cert.pem")),
  };
  server = https.createServer(sslOptions, app);
  console.log("[SERVER] Режим: HTTPS");
} catch (e) {
  console.log("[SERVER] SSL не найдены, запускаю HTTP");
  server = http.createServer(app);
}

const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// ==================== ХРАНИЛИЩА ====================
let subscriptions = [];
const reminders = new Map();

// ==================== Функция отправки push ====================
function sendPushToAll(payload) {
  const payloadStr =
    typeof payload === "string" ? payload : JSON.stringify(payload);

  console.log(`[PUSH] Отправляю ${subscriptions.length} подписчикам`);

  subscriptions.forEach((sub, index) => {
    webpush
      .sendNotification(sub, payloadStr)
      .then(() => console.log(`[PUSH] #${index} ✅`))
      .catch((err) => {
        console.error(`[PUSH] #${index} ❌`, err.statusCode);
        if (err.statusCode === 410 || err.statusCode === 404) {
          subscriptions = subscriptions.filter(
            (s) => s.endpoint !== sub.endpoint,
          );
        }
      });
  });
}

// ==================== SOCKET.IO ====================
io.on("connection", (socket) => {
  console.log("[SOCKET] Клиент подключён:", socket.id);

  // Обычная заметка — мгновенный push + WS
  socket.on("newTask", (task) => {
    console.log("[SOCKET] Новая задача:", task.text);
    io.emit("taskAdded", task);

    sendPushToAll({
      title: "📌 Новая задача",
      body: task.text,
      reminderId: null,
    });
  });

  // Напоминание — отложенный push + WS popup
  socket.on("newReminder", (reminder) => {
    const { id, text, reminderTime } = reminder;
    const delay = reminderTime - Date.now();

    console.log(`[REMINDER] "${text}" через ${Math.round(delay / 1000)} сек`);

    if (delay <= 0) {
      console.log("[REMINDER] Время прошло, отправляю сразу");
      sendPushToAll({
        title: "⏰ Напоминание",
        body: text,
        reminderId: id,
      });
      io.emit("reminderFired", { id, text });
      // Сохраняем в Map для возможного snooze
      reminders.set(id, { timeoutId: null, text, reminderTime });
      return;
    }

    const timeoutId = setTimeout(() => {
      console.log(`[REMINDER] ⏰ Сработало: "${text}"`);

      // Push уведомление от ОС
      sendPushToAll({
        title: "⏰ Напоминание",
        body: text,
        reminderId: id,
      });

      // WebSocket popup в браузере
      io.emit("reminderFired", { id, text });

      // Не удаляем из Map — оставляем текст для snooze
      const existing = reminders.get(id);
      if (existing) {
        existing.timeoutId = null;
      }
    }, delay);

    reminders.set(id, { timeoutId, text, reminderTime });
    console.log(`[REMINDER] Запланировано, всего: ${reminders.size}`);
  });

  socket.on("disconnect", () => {
    console.log("[SOCKET] Клиент отключён:", socket.id);
  });
});

// ==================== МАРШРУТЫ ====================

app.post("/subscribe", (req, res) => {
  const subscription = req.body;
  const exists = subscriptions.some(
    (sub) => sub.endpoint === subscription.endpoint,
  );
  if (!exists) {
    subscriptions.push(subscription);
  }
  console.log("[SUBSCRIBE] Всего подписок:", subscriptions.length);
  res.status(201).json({ message: "Подписка сохранена" });
});

app.post("/unsubscribe", (req, res) => {
  const { endpoint } = req.body;
  subscriptions = subscriptions.filter((sub) => sub.endpoint !== endpoint);
  res.status(200).json({ message: "Подписка удалена" });
});

// Отложить напоминание на 5 минут
app.post("/snooze", (req, res) => {
  const reminderId = parseInt(req.query.reminderId, 10);
  // Принимаем текст из body как запасной вариант
  const bodyText = req.body && req.body.text ? req.body.text : null;

  console.log("[SNOOZE] reminderId:", reminderId, "bodyText:", bodyText);

  if (!reminderId) {
    return res.status(400).json({ error: "reminderId обязателен" });
  }

  // Отменяем старый таймер если есть
  if (reminders.has(reminderId)) {
    const old = reminders.get(reminderId);
    if (old.timeoutId) {
      clearTimeout(old.timeoutId);
    }
  }

  const snoozeDelay = 5 * 60 * 1000;

  // Берём текст: из Map, из body, или fallback
  let text = "Отложенное напоминание";
  if (reminders.has(reminderId) && reminders.get(reminderId).text) {
    text = reminders.get(reminderId).text;
  } else if (bodyText) {
    text = bodyText;
  }

  const newTimeoutId = setTimeout(() => {
    console.log(`[SNOOZE] ⏰ Сработало: "${text}"`);

    sendPushToAll({
      title: "⏰ Напоминание (отложено)",
      body: text,
      reminderId: reminderId,
    });

    io.emit("reminderFired", { id: reminderId, text });

    // Не удаляем — оставляем для повторного snooze
    const existing = reminders.get(reminderId);
    if (existing) {
      existing.timeoutId = null;
    }
  }, snoozeDelay);

  reminders.set(reminderId, {
    timeoutId: newTimeoutId,
    text: text,
    reminderTime: Date.now() + snoozeDelay,
  });

  console.log(`[SNOOZE] Отложено на 5 мин`);
  res.status(200).json({ message: "Отложено на 5 минут" });
});

// Тестовый push
app.get("/test-push", (req, res) => {
  if (subscriptions.length === 0) {
    return res.status(400).json({ error: "Нет подписок" });
  }

  const payload = JSON.stringify({
    title: "🧪 Тест",
    body: "Push работает! " + new Date().toLocaleTimeString(),
  });

  Promise.all(
    subscriptions.map((sub, i) =>
      webpush
        .sendNotification(sub, payload)
        .then(() => ({ i, status: "ok" }))
        .catch((err) => ({ i, status: "error", code: err.statusCode })),
    ),
  ).then((results) => {
    res.json({ results });
  });
});

// ==================== ЗАПУСК ====================
const PORT = 3001;
server.listen(PORT, () => {
  const protocol = server instanceof https.Server ? "https" : "http";
  console.log(`\n========================================`);
  console.log(`Сервер: ${protocol}://localhost:${PORT}`);
  console.log(`Тест:   ${protocol}://localhost:${PORT}/test-push`);
  console.log(`========================================\n`);
});
