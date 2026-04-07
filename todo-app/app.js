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
  const list = document.getElementById("notes-list");

  if (!form || !input || !list) return;

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
        return `<li class="note-item">
                <span class="note-text">${escapeHtml(text)}</span>
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

  function addNote(text) {
    const notes = JSON.parse(localStorage.getItem("notes") || "[]");
    notes.push({ id: Date.now(), text });
    localStorage.setItem("notes", JSON.stringify(notes));
    loadNotes();
    socket.emit("newTask", { text, timestamp: Date.now() });
  }

  function deleteNote(index) {
    const notes = JSON.parse(localStorage.getItem("notes") || "[]");
    notes.splice(index, 1);
    localStorage.setItem("notes", JSON.stringify(notes));
    loadNotes();
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (text) {
      addNote(text);
      input.value = "";
      input.focus();
    }
  });

  loadNotes();
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

// ==================== PUSH ====================
const VAPID_PUBLIC_KEY =
  "BO78vbRcjLrvs2bAfbzal794I3h6AoYKiWvcZr1imzygn_qkkXFEbEa0pmS1AuWNP3cZAEGQbsiuuefER9UYLnA";

// ИСПРАВЛЕННАЯ ФУНКЦИЯ
function urlBase64ToUint8Array(base64String) {
  // Убираем все пробелы, переносы строк и прочий мусор
  const cleaned = base64String.replace(/[\s\n\r]/g, "");

  // Добавляем padding
  const padding = "=".repeat((4 - (cleaned.length % 4)) % 4);
  const base64 = (cleaned + padding).replace(/-/g, "+").replace(/_/g, "/");

  let rawData;
  try {
    rawData = window.atob(base64);
  } catch (e) {
    console.error("[PUSH] Ошибка atob! Ключ невалидный:", e);
    console.error("[PUSH] Строка для atob:", base64);
    console.error("[PUSH] Длина:", base64.length);
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
    console.log("[PUSH] SW готов");

    let subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      console.log("[PUSH] Подписка уже есть");
    } else {
      console.log("[PUSH] Создаю новую подписку...");
      console.log(
        "[PUSH] VAPID ключ (первые 20 символов):",
        VAPID_PUBLIC_KEY.substring(0, 20),
      );
      console.log("[PUSH] VAPID ключ длина:", VAPID_PUBLIC_KEY.length);

      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      console.log(
        "[PUSH] applicationServerKey создан, длина:",
        applicationServerKey.length,
      );

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

      // Проверяем текущую подписку и переотправляем на сервер
      const currentSub = await reg.pushManager.getSubscription();
      if (currentSub) {
        enableBtn.style.display = "none";
        disableBtn.style.display = "inline-block";
        await fetch(`${SERVER_URL}/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(currentSub),
        });
        console.log("[PUSH] Существующая подписка отправлена на сервер");
      }

      enableBtn.addEventListener("click", async () => {
        console.log("[PUSH] Клик: включить");

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
