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
// Сгенерируй свои: npx web-push generate-vapid-keys
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

// ==================== HTTPS СЕРВЕР ====================
let server;

try {
  const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, "key.pem")),
    cert: fs.readFileSync(path.join(__dirname, "cert.pem")),
  };
  server = https.createServer(sslOptions, app);
  console.log("[SERVER] Режим: HTTPS");
} catch (e) {
  console.log("[SERVER] SSL файлы не найдены, запускаю HTTP");
  server = http.createServer(app);
}

const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// ==================== ПОДПИСКИ ====================
let subscriptions = [];

// ==================== SOCKET.IO ====================
io.on("connection", (socket) => {
  console.log("[SOCKET] Клиент подключён:", socket.id);

  socket.on("newTask", (task) => {
    console.log("[SOCKET] Получена задача:", task.text);
    console.log("[PUSH] Количество подписок:", subscriptions.length);

    io.emit("taskAdded", task);

    const payload = JSON.stringify({
      title: "Новая задача",
      body: task.text,
    });

    subscriptions.forEach((sub, index) => {
      console.log(`[PUSH] Отправляю #${index} -> ${sub.endpoint.slice(-30)}`);

      webpush
        .sendNotification(sub, payload)
        .then(() => {
          console.log(`[PUSH] #${index} успешно отправлен`);
        })
        .catch((err) => {
          console.error(`[PUSH] #${index} ошибка:`, err.statusCode, err.body);
          if (err.statusCode === 410 || err.statusCode === 404) {
            subscriptions = subscriptions.filter(
              (s) => s.endpoint !== sub.endpoint,
            );
          }
        });
    });
  });

  socket.on("disconnect", () => {
    console.log("[SOCKET] Клиент отключён:", socket.id);
  });
});

// ==================== МАРШРУТЫ ====================
app.post("/subscribe", (req, res) => {
  const subscription = req.body;
  console.log(
    "[SUBSCRIBE] Получена подписка:",
    subscription.endpoint.slice(-30),
  );

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
  console.log("[UNSUBSCRIBE] Всего подписок:", subscriptions.length);
  res.status(200).json({ message: "Подписка удалена" });
});

app.get("/test-push", (req, res) => {
  console.log("[TEST] Подписок:", subscriptions.length);

  if (subscriptions.length === 0) {
    return res.status(400).json({ error: "Нет подписок" });
  }

  const payload = JSON.stringify({
    title: "Тестовое уведомление",
    body: "Push работает!",
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
