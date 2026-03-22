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
app.use(cors());

const ACCESS_SECRET = "access_secret";
const REFRESH_SECRET = "refresh_secret";
const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";

const DEFAULT_IMAGE =
  "https://www.kukumyava.ru/upload/resize_cache/iblock/231/yjqfkea54zk9rbry46owefncod4fiy8s/1200_1200_140cd750bba9870f18aada2478b24840a/15523-02.jpg";

// { id, username, passwordHash, role, isBlocked }
let users = [
  {
    id: "1",
    username: "admin",
    passwordHash: bcrypt.hashSync("admin123", 10),
    role: "admin",
    isBlocked: false,
  },
  {
    id: "2",
    username: "seller",
    passwordHash: bcrypt.hashSync("seller123", 10),
    role: "seller",
    isBlocked: false,
  },
  {
    id: "3",
    username: "user",
    passwordHash: bcrypt.hashSync("user123", 10),
    role: "user",
    isBlocked: false,
  },
];

const refreshTokens = new Set();

let products = [
  {
    id: crypto.randomUUID(),
    title: "Игрушка крокодил",
    category: "Игрушки",
    description: "Мягкий плюшевый крокодил",
    price: 1500,
    image: DEFAULT_IMAGE,
  },
  {
    id: crypto.randomUUID(),
    title: "Игрушка крокодил (Малая)",
    category: "Игрушки",
    description: "Маленький плюшевый крокодил ",
    price: 900,
    image: DEFAULT_IMAGE,
  },
  {
    id: crypto.randomUUID(),
    title: "Игрушка крокодил (Большая)",
    category: "Игрушки",
    description: "Огромная подушка",
    price: 2500,
    image: DEFAULT_IMAGE,
  },
];

function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      role: user.role,
    },
    ACCESS_SECRET,
    {
      expiresIn: ACCESS_EXPIRES_IN,
    },
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      role: user.role,
    },
    REFRESH_SECRET,
    {
      expiresIn: REFRESH_EXPIRES_IN,
    },
  );
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      error: "Missing or invalid Authorization header",
    });
  }

  try {
    const payload = jwt.verify(token, ACCESS_SECRET);

    const user = users.find((u) => u.id === payload.sub);
    if (!user) {
      return res.status(401).json({
        error: "User not found",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        error: "User is blocked",
      });
    }

    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({
      error: "Invalid or expired token",
    });
  }
}

function roleMiddleware(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Forbidden",
      });
    }
    next();
  };
}

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Магазина RBAC",
      version: "1.0.0",
      description:
        "Практика 11: роли пользователей, refresh-токены, товары и пользователи",
    },
    servers: [{ url: `http://localhost:${port}` }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./index.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Регистрация пользователя
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: { type: string, example: "student" }
 *               password: { type: string, example: "123456" }
 *               role:
 *                 type: string
 *                 example: "user"
 *                 description: "Допустимо: user, seller, admin. Если не передан — user"
 *     responses:
 *       201: { description: "Пользователь создан" }
 *       400: { description: "Некорректный запрос" }
 *       409: { description: "Пользователь уже существует" }
 */
app.post("/api/auth/register", async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      error: "username and password are required",
    });
  }

  const exists = users.some((u) => u.username === username);
  if (exists) {
    return res.status(409).json({
      error: "username already exists",
    });
  }

  const allowedRoles = ["user", "seller", "admin"];
  const safeRole = allowedRoles.includes(role) ? role : "user";

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: String(users.length + 1),
    username,
    passwordHash,
    role: safeRole,
    isBlocked: false,
  };

  users.push(user);

  res.status(201).json({
    id: user.id,
    username: user.username,
    role: user.role,
    isBlocked: user.isBlocked,
  });
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Вход в систему
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: { type: string, example: "admin" }
 *               password: { type: string, example: "admin123" }
 *     responses:
 *       200:
 *         description: Успешный вход
 *       401: { description: "Неверные данные" }
 *       403: { description: "Пользователь заблокирован" }
 */
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      error: "username and password are required",
    });
  }

  const user = users.find((u) => u.username === username);
  if (!user) {
    return res.status(401).json({
      error: "Invalid credentials",
    });
  }

  if (user.isBlocked) {
    return res.status(403).json({
      error: "User is blocked",
    });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({
      error: "Invalid credentials",
    });
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  refreshTokens.add(refreshToken);

  res.json({
    accessToken,
    refreshToken,
  });
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Обновление пары токенов
 *     parameters:
 *       - in: header
 *         name: refresh-token
 *         required: false
 *         schema:
 *           type: string
 *         description: Refresh токен в заголовке
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: "Новая пара токенов" }
 *       400: { description: "Не передан refreshToken" }
 *       401: { description: "Невалидный токен" }
 *       403: { description: "Пользователь заблокирован" }
 */
app.post("/api/auth/refresh", (req, res) => {
  const refreshToken = req.headers["refresh-token"] || req.body.refreshToken;

  if (!refreshToken) {
    return res.status(400).json({
      error: "refreshToken is required",
    });
  }

  if (!refreshTokens.has(refreshToken)) {
    return res.status(401).json({
      error: "Invalid refresh token",
    });
  }

  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = users.find((u) => u.id === payload.sub);

    if (!user) {
      return res.status(401).json({
        error: "User not found",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        error: "User is blocked",
      });
    }

    refreshTokens.delete(refreshToken);

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    refreshTokens.add(newRefreshToken);

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    return res.status(401).json({
      error: "Invalid or expired refresh token",
    });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Получить текущего пользователя
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: "Текущий пользователь" }
 *       401: { description: "Не авторизован" }
 */
app.get("/api/auth/me", authMiddleware, (req, res) => {
  const user = users.find((u) => u.id === req.user.sub);

  res.json({
    id: user.id,
    username: user.username,
    role: user.role,
    isBlocked: user.isBlocked,
  });
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Получить список пользователей
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: "Список пользователей" }
 *       403: { description: "Только для admin" }
 */
app.get("/api/users", authMiddleware, roleMiddleware(["admin"]), (req, res) => {
  const safeUsers = users.map((u) => ({
    id: u.id,
    username: u.username,
    role: u.role,
    isBlocked: u.isBlocked,
  }));

  res.json(safeUsers);
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Получить пользователя по id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: "Пользователь найден" }
 *       404: { description: "Пользователь не найден" }
 */
app.get(
  "/api/users/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  (req, res) => {
    const user = users.find((u) => u.id === req.params.id);

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      isBlocked: user.isBlocked,
    });
  },
);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Обновить пользователя
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
 *               username: { type: string, example: "new_username" }
 *               role: { type: string, example: "seller" }
 *               password: { type: string, example: "newpassword123" }
 *     responses:
 *       200: { description: "Пользователь обновлён" }
 *       404: { description: "Пользователь не найден" }
 */
app.put(
  "/api/users/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  async (req, res) => {
    const { username, role, password } = req.body;
    const userIndex = users.findIndex((u) => u.id === req.params.id);

    if (userIndex === -1) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    if (username) {
      users[userIndex].username = username;
    }

    if (role && ["user", "seller", "admin"].includes(role)) {
      users[userIndex].role = role;
    }

    if (password) {
      users[userIndex].passwordHash = await bcrypt.hash(password, 10);
    }

    res.json({
      id: users[userIndex].id,
      username: users[userIndex].username,
      role: users[userIndex].role,
      isBlocked: users[userIndex].isBlocked,
    });
  },
);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Заблокировать пользователя
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: "Пользователь заблокирован" }
 *       404: { description: "Пользователь не найден" }
 */
app.delete(
  "/api/users/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  (req, res) => {
    const user = users.find((u) => u.id === req.params.id);

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    user.isBlocked = true;

    res.json({
      message: "User blocked",
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        isBlocked: user.isBlocked,
      },
    });
  },
);

/**
 * @swagger
 * /api/products:
 *   post:
 *     tags: [Products]
 *     summary: Создать товар
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string, example: "Новая сова" }
 *               category: { type: string, example: "Игрушки" }
 *               description: { type: string, example: "Очень мягкая игрушка" }
 *               price: { type: number, example: 1800 }
 *               image: { type: string, example: "https://site.com/image.jpg" }
 *     responses:
 *       201: { description: "Товар создан" }
 *       403: { description: "Только seller или admin" }
 */
app.post(
  "/api/products",
  authMiddleware,
  roleMiddleware(["seller", "admin"]),
  (req, res) => {
    const { title, category, description, price, image } = req.body;

    const newProduct = {
      id: crypto.randomUUID(),
      title,
      category,
      description,
      price,
      image: image || DEFAULT_IMAGE,
    };

    products.push(newProduct);
    res.status(201).json(newProduct);
  },
);

/**
 * @swagger
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: Получить список товаров
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: "Список товаров" }
 *       403: { description: "Только авторизованный пользователь" }
 */
app.get(
  "/api/products",
  authMiddleware,
  roleMiddleware(["user", "seller", "admin"]),
  (req, res) => {
    res.json(products);
  },
);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Получить товар по id
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
app.get(
  "/api/products/:id",
  authMiddleware,
  roleMiddleware(["user", "seller", "admin"]),
  (req, res) => {
    const product = products.find((p) => p.id === req.params.id);

    if (!product) {
      return res.status(404).json({
        error: "Product not found",
      });
    }

    res.json(product);
  },
);

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
 *       200: { description: "Товар обновлён" }
 *       404: { description: "Товар не найден" }
 */
app.put(
  "/api/products/:id",
  authMiddleware,
  roleMiddleware(["seller", "admin"]),
  (req, res) => {
    const productIndex = products.findIndex((p) => p.id === req.params.id);

    if (productIndex === -1) {
      return res.status(404).json({
        error: "Product not found",
      });
    }

    products[productIndex] = {
      ...products[productIndex],
      ...req.body,
    };

    res.json(products[productIndex]);
  },
);

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
 *       200: { description: "Товар удалён" }
 *       404: { description: "Товар не найден" }
 */
app.delete(
  "/api/products/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  (req, res) => {
    const productIndex = products.findIndex((p) => p.id === req.params.id);

    if (productIndex === -1) {
      return res.status(404).json({
        error: "Product not found",
      });
    }

    products.splice(productIndex, 1);

    res.json({
      message: "Product deleted",
    });
  },
);

app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
  console.log(`Swagger: http://localhost:${port}/api-docs`);
});
