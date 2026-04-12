// ==================== ОПРЕДЕЛЯЕМ ПРОТОКОЛ ====================
const SERVER_URL = window.location.origin;
const socket = io(SERVER_URL);

// ==================== НАВИГАЦИЯ ====================
const contentDiv = document.getElementById("app-content");
const homeBtn = document.getElementById("home-btn");
const aboutBtn = document.getElementById("about-btn");

function setActiveButton(activeId) {
  [homeBtn, aboutBtn].forEach((btn) => btn.classList.remove("active"));
  document.getElementById(activeId).classList.add("active");
}

async function loadContent(page) {
  try {
    const response = await fetch(`/content/${page}.html`);
    const html = await response.text();
    contentDiv.innerHTML = html;

    if (page === "home") {
      initNotes();
    }
  } catch (err) {
    contentDiv.innerHTML = `<p class="text-error">Ошибка загрузки страницы.</p>`;
    console.error(err);
  }
}

homeBtn.addEventListener("click", () => {
  setActiveButton("home-btn");
  loadContent("home");
});

aboutBtn.addEventListener("click", () => {
  setActiveButton("about-btn");
  loadContent("about");
});

loadContent("home");

// ==================== ЗАМЕТКИ ====================
function initNotes() {
  const form = document.getElementById("note-form");
  const input = document.getElementById("note-input");
  const reminderForm = document.getElementById("reminder-form");
  const reminderText = document.getElementById("reminder-text");
  const reminderTime = document.getElementById("reminder-time");
  const list = document.getElementById("notes-list");

  if (!form || !input || !list) return;

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function loadNotes() {
    const notes = JSON.parse(localStorage.getItem("notes") || "[]");

    if (notes.length === 0) {
      list.innerHTML =
        '<li class="empty-message">Заметок пока нет. Добавьте первую!</li>';
      return;
    }

    list.innerHTML = notes
      .map((note, index) => {
        const text = typeof note === "object" ? note.text : note;
        let reminderInfo = "";
        if (note.reminder) {
          const d = new Date(note.reminder);
          const isPast = note.reminder < Date.now();
          const style = isPast
            ? "color: #27ae60; text-decoration: line-through;"
            : "color: #e67e22;";
          const prefix = isPast ? "✅" : "⏰";
          reminderInfo = `<br><small style="${style}">${prefix} ${d.toLocaleString()}</small>`;
        }
        return `<li class="note-item">
                <span class="note-text">${escapeHtml(text)}${reminderInfo}</span>
                <button class="btn-delete" data-index="${index}">✕</button>
            </li>`;
      })
      .join("");

    list.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.addEventListener("click", () => {
        deleteNote(parseInt(btn.dataset.index));
      });
    });
  }

  function addNote(text, reminderTimestamp = null) {
    const notes = JSON.parse(localStorage.getItem("notes") || "[]");
    const newNote = { id: Date.now(), text, reminder: reminderTimestamp };
    notes.push(newNote);
    localStorage.setItem("notes", JSON.stringify(notes));
    loadNotes();

    if (reminderTimestamp) {
      socket.emit("newReminder", {
        id: newNote.id,
        text: text,
        reminderTime: reminderTimestamp,
      });
      console.log("[APP] Напоминание отправлено на сервер");
    } else {
      socket.emit("newTask", { text, timestamp: Date.now() });
    }
  }

  function deleteNote(index) {
    const notes = JSON.parse(localStorage.getItem("notes") || "[]");
    notes.splice(index, 1);
    localStorage.setItem("notes", JSON.stringify(notes));
    loadNotes();
  }

  // Обычная заметка
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (text) {
      addNote(text);
      input.value = "";
      input.focus();
    }
  });

  // Заметка с напоминанием
  if (reminderForm && reminderText && reminderTime) {
    reminderForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = reminderText.value.trim();
      const datetime = reminderTime.value;

      if (!text || !datetime) {
        alert("Заполните текст и время напоминания");
        return;
      }

      const timestamp = new Date(datetime).getTime();
      if (timestamp <= Date.now()) {
        alert("Время напоминания должно быть в будущем!");
        return;
      }

      addNote(text, timestamp);
      reminderText.value = "";
      reminderTime.value = "";
    });
  }

  loadNotes();
}

// ==================== POPUP НАПОМИНАНИЯ ====================
function showReminderPopup(reminderId, text) {
  // Убираем старый popup если есть
  const existingPopup = document.getElementById("reminder-popup");
  if (existingPopup) {
    existingPopup.remove();
  }

  // Создаём popup заново (на случай если мы не на home странице)
  const popup = document.createElement("div");
  popup.id = "reminder-popup";
  popup.className = "reminder-popup";
  popup.innerHTML = `
    <div class="reminder-popup-content">
      <span class="reminder-icon">⏰</span>
      <p id="reminder-popup-text">${text}</p>
      <div class="reminder-popup-buttons">
        <button id="reminder-snooze" class="btn-snooze">Отложить на 5 мин</button>
        <button id="reminder-dismiss" class="btn-dismiss">Закрыть</button>
      </div>
    </div>
  `;
  document.body.appendChild(popup);

  // Звук (если поддерживается)
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.frequency.value = 800;
    oscillator.type = "sine";
    gainNode.gain.value = 0.3;
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      audioCtx.close();
    }, 300);
  } catch (e) {
    // Игнорируем если аудио не поддерживается
  }

  // Кнопка «Отложить на 5 мин»
  document
    .getElementById("reminder-snooze")
    .addEventListener("click", async () => {
      console.log("[POPUP] Откладываем на 5 мин, id:", reminderId);

      try {
        const response = await fetch(
          `${SERVER_URL}/snooze?reminderId=${reminderId}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: text }),
          },
        );
        const result = await response.json();
        console.log("[POPUP] Snooze ответ:", result);

        // Обновляем время в localStorage
        const notes = JSON.parse(localStorage.getItem("notes") || "[]");
        const noteIndex = notes.findIndex((n) => n.id === reminderId);
        if (noteIndex !== -1) {
          notes[noteIndex].reminder = Date.now() + 5 * 60 * 1000;
          localStorage.setItem("notes", JSON.stringify(notes));
        }

        // Показываем подтверждение
        popup.querySelector(".reminder-popup-content").innerHTML = `
        <span class="reminder-icon">✅</span>
        <p>Отложено на 5 минут</p>
      `;
        setTimeout(() => popup.remove(), 1500);
      } catch (err) {
        console.error("[POPUP] Ошибка snooze:", err);
        alert("Ошибка при откладывании");
      }
    });

  // Кнопка «Закрыть»
  document.getElementById("reminder-dismiss").addEventListener("click", () => {
    popup.remove();
  });

  // Закрытие по клику на фон
  popup.addEventListener("click", (e) => {
    if (e.target === popup) {
      popup.remove();
    }
  });
}

// ==================== WS УВЕДОМЛЕНИЯ ====================
socket.on("taskAdded", (task) => {
  console.log("[WS] Задача от сервера:", task);

  const existing = document.querySelector(".ws-notification");
  if (existing) existing.remove();

  const notification = document.createElement("div");
  notification.className = "ws-notification";
  notification.textContent = `📌 Новая задача: ${task.text}`;
  document.body.appendChild(notification);

  setTimeout(() => {
    if (notification.parentNode) notification.remove();
  }, 3000);
});

// Получаем напоминание через WebSocket — показываем popup
socket.on("reminderFired", (data) => {
  console.log("[WS] Напоминание сработало:", data);
  showReminderPopup(data.id, data.text);
});

// ==================== PUSH ====================
const VAPID_PUBLIC_KEY =
  "BO78vbRcjLrvs2bAfbzal794I3h6AoYKiWvcZr1imzygn_qkkXFEbEa0pmS1AuWNP3cZAEGQbsiuuefER9UYLnA";

function urlBase64ToUint8Array(base64String) {
  const cleaned = base64String.replace(/[\s\n\r]/g, "");
  const padding = "=".repeat((4 - (cleaned.length % 4)) % 4);
  const base64 = (cleaned + padding).replace(/-/g, "+").replace(/_/g, "/");

  let rawData;
  try {
    rawData = window.atob(base64);
  } catch (e) {
    console.error("[PUSH] Ошибка atob:", e);
    throw e;
  }

  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function subscribeToPush() {
  console.log("[PUSH] Начинаю подписку...");

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.log("[PUSH] Браузер не поддерживает push");
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey,
      });
      console.log("[PUSH] Подписка создана!");
    }

    const response = await fetch(`${SERVER_URL}/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    });

    const result = await response.json();
    console.log("[PUSH] Сервер ответил:", result);
    return true;
  } catch (err) {
    console.error("[PUSH] Ошибка подписки:", err);
    return false;
  }
}

async function unsubscribeFromPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await fetch(`${SERVER_URL}/unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      await subscription.unsubscribe();
      console.log("[PUSH] Отписка выполнена");
    }
  } catch (err) {
    console.error("[PUSH] Ошибка отписки:", err);
  }
}

// ==================== РЕГИСТРАЦИЯ SW ====================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      console.log("[SW] Зарегистрирован:", reg.scope);

      await navigator.serviceWorker.ready;
      console.log("[SW] Активен");

      const enableBtn = document.getElementById("enable-push");
      const disableBtn = document.getElementById("disable-push");

      if (!enableBtn || !disableBtn) {
        console.error("[PUSH] Кнопки не найдены!");
        return;
      }

      const currentSub = await reg.pushManager.getSubscription();
      if (currentSub) {
        enableBtn.style.display = "none";
        disableBtn.style.display = "inline-block";
        await fetch(`${SERVER_URL}/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(currentSub),
        });
      }

      enableBtn.addEventListener("click", async () => {
        if (Notification.permission === "denied") {
          alert("Уведомления заблокированы в настройках браузера!");
          return;
        }

        if (Notification.permission === "default") {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            alert("Нужно разрешить уведомления");
            return;
          }
        }

        const success = await subscribeToPush();
        if (success) {
          enableBtn.style.display = "none";
          disableBtn.style.display = "inline-block";
        }
      });

      disableBtn.addEventListener("click", async () => {
        await unsubscribeFromPush();
        disableBtn.style.display = "none";
        enableBtn.style.display = "inline-block";
      });
    } catch (err) {
      console.error("[SW] Ошибка:", err);
    }
  });
}
