const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors()); // Разрешаем запросы с React (порт 5173)

// Секреты подписи и время жизни токенов (Практика 9)
const ACCESS_SECRET = "access_secret";
const REFRESH_SECRET = "refresh_secret";
const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";

// Базы данных в памяти
let users = [];
const refreshTokens = new Set(); 

// 3 начальные карточки товаров
let products = [
  {
    id: crypto.randomUUID(),
    title: "Игрушка Гена",
    category: "Игрушки",
    description: "Мягкая плюшевая гена",
    price: 1500,
    image: "https://www.kukumyava.ru/upload/resize_cache/iblock/231/yjqfkea54zk9rbry46owefncod4fiy8s/1200_1200_140cd750bba9870f18aada2478b24840a/15523-02.jpg"
  },
  {
    id: crypto.randomUUID(),
    title: "Игрушка кракадила (Малая)",
    category: "Игрушки",
    description: "Маленькая плюшевая кракадила",
    price: 900,
    image: "https://www.kukumyava.ru/upload/resize_cache/iblock/231/yjqfkea54zk9rbry46owefncod4fiy8s/1200_1200_140cd750bba9870f18aada2478b24840a/15523-02.jpg"
  },
  {
    id: crypto.randomUUID(),
    title: "Игрушка крокодил (Большая)",
    category: "Игрушки",
    description: "Огромная подушка",
    price: 2500,
    image: "https://www.kukumyava.ru/upload/resize_cache/iblock/231/yjqfkea54zk9rbry46owefncod4fiy8s/1200_1200_140cd750bba9870f18aada2478b24840a/15523-02.jpg"
  }
];

// Вспомогательные функции
function generateAccessToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

function generateRefreshToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

// ================= НАСТРОЙКА SWAGGER =================
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: { 
      title: "API Магазина (Практика 9-10)", 
      version: "1.0.0",
      description: "API для регистрации, авторизации (с Refresh-токенами) и управления товарами."
    },
    servers: [{ url: `http://localhost:${port}` }],
    components: {
      securitySchemes: {
        bearerAuth: { 
          type: "http", 
          scheme: "bearer", 
          bearerFormat: "JWT" 
        },
      },
    },
  },
  apis: ["./index.js"],
};

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerJsdoc(swaggerOptions)));

// Middleware проверки Access токена
function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }
  const token = authHeader.split(" ")[1];
  try {
    req.user = jwt.verify(token, ACCESS_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired access token" });
  }
}

// ================= РОУТЫ АВТОРИЗАЦИИ =================

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Регистрация нового пользователя
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: { type: string, example: "student" }
 *               password: { type: string, example: "123456" }
 *     responses:
 *       201: { description: "Пользователь создан" }
 *       400: { description: "Некорректный запрос (пустые поля)" }
 *       409: { description: "Пользователь уже существует" }
 */
app.post("/api/auth/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "username and password are required" });
  if (users.find((u) => u.username === username)) return res.status(409).json({ error: "username already exists" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = { id: String(users.length + 1), username, passwordHash };
  users.push(user);
  res.status(201).json({ id: user.id, username: user.username });
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Вход в систему (получение пары токенов)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: { type: string, example: "student" }
 *               password: { type: string, example: "123456" }
 *     responses:
 *       200: 
 *         description: "Успешный вход, возвращает токены"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *                 refreshToken: { type: string }
 *       401: { description: "Неверные учетные данные" }
 */
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "username and password are required" });

  const user = users.find((u) => u.username === username);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  refreshTokens.add(refreshToken);
  res.json({ accessToken, refreshToken });
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Обновление Access и Refresh токенов
 *     parameters:
 *       - in: header
 *         name: refresh-token
 *         required: false
 *         schema:
 *           type: string
 *         description: Refresh токен передается в заголовке
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken: { type: string, description: "Также можно передать в теле (фоллбэк)" }
 *     responses:
 *       200:
 *         description: "Новая пара токенов"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *                 refreshToken: { type: string }
 *       400: { description: "Не передан refresh токен" }
 *       401: { description: "Токен недействителен или просрочен" }
 */
app.post("/api/auth/refresh", (req, res) => {
  const refreshToken = req.headers["refresh-token"] || req.body.refreshToken;
  if (!refreshToken) return res.status(400).json({ error: "refreshToken is required" });
  if (!refreshTokens.has(refreshToken)) return res.status(401).json({ error: "Invalid refresh token" });

  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = users.find((u) => u.id === payload.sub);
    if (!user) return res.status(401).json({ error: "User not found" });

    // Ротация токена
    refreshTokens.delete(refreshToken);
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    refreshTokens.add(newRefreshToken);

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Получение информации о текущем пользователе
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: "Информация о пользователе" }
 *       401: { description: "Не авторизован" }
 */
app.get("/api/auth/me", authMiddleware, (req, res) => {
  const user = users.find((u) => u.id === req.user.sub);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ id: user.id, username: user.username });
});

// ================= РОУТЫ ТОВАРОВ =================

/**
 * @swagger
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: Получить список всех товаров
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: "Список товаров" }
 */
app.get("/api/products", authMiddleware, (req, res) => {
  res.status(200).json(products);
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     tags: [Products]
 *     summary: Создать новый товар
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string, example: "Игрушка Сова (Новая)" }
 *               category: { type: string, example: "Игрушки" }
 *               description: { type: string, example: "Очень мягкая" }
 *               price: { type: number, example: 1200 }
 *               image: { type: string, example: "https://url.com/image.jpg" }
 *     responses:
 *       201: { description: "Товар успешно создан" }
 *       401: { description: "Не авторизован" }
 */
app.post("/api/products", authMiddleware, (req, res) => {
  const { title, category, description, price, image } = req.body;
  const newProduct = {
    id: crypto.randomUUID(),
    title,
    category,
    description,
    price,
    image: image || "https://www.kukumyava.ru/upload/resize_cache/iblock/231/yjqfkea54zk9rbry46owefncod4fiy8s/1200_1200_140cd750bba9870f18aada2478b24840a/15523-02.jpg",
  };
  products.push(newProduct);
  res.status(201).json(newProduct);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Получить товар по ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: "Товар найден" }
 *       404: { description: "Товар не найден" }
 */
app.get("/api/products/:id", authMiddleware, (req, res) => {
  const product = products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.status(200).json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     tags: [Products]
 *     summary: Обновить товар
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               category: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *               image: { type: string }
 *     responses:
 *       200: { description: "Товар обновлен" }
 *       404: { description: "Товар не найден" }
 */
app.put("/api/products/:id", authMiddleware, (req, res) => {
  const productIndex = products.findIndex((p) => p.id === req.params.id);
  if (productIndex === -1) return res.status(404).json({ error: "Product not found" });
  products[productIndex] = { ...products[productIndex], ...req.body };
  res.status(200).json(products[productIndex]);
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: Удалить товар
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: "Товар удален" }
 *       404: { description: "Товар не найден" }
 */
app.delete("/api/products/:id", authMiddleware, (req, res) => {
  const productIndex = products.findIndex((p) => p.id === req.params.id);
  if (productIndex === -1) return res.status(404).json({ error: "Product not found" });
  products.splice(productIndex, 1);
  res.status(200).json({ message: "Product deleted" });
});

app.listen(port, () => {
  console.log(`Бэкенд запущен: http://localhost:${port}`);
  console.log(`Swagger документация: http://localhost:${port}/api-docs`);
});