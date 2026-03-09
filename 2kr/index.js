const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const app = express();
const port = 3000;

app.use(express.json());

const JWT_SECRET = "access_secret";
const ACCESS_EXPIRES_IN = "15m";

let users = [];
let products = [];

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Практика 8 (Полная)",
      version: "1.0.0",
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

function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(" ")[1];

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string, example: "student@mail.com" }
 *               first_name: { type: string, example: "Иван" }
 *               last_name: { type: string, example: "Иванов" }
 *               password: { type: string, example: "123456" }
 *     responses:
 *       201: { description: "User created" }
 *       400: { description: "Bad request" }
 */
app.post("/api/auth/register", async (req, res) => {
  const { email, first_name, last_name, password } = req.body;

  if (!email || !first_name || !last_name || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (users.find((u) => u.email === email)) {
    return res.status(400).json({ error: "Email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = {
    id: crypto.randomUUID(),
    email,
    first_name,
    last_name,
    passwordHash,
  };

  users.push(newUser);
  res.status(201).json({
    id: newUser.id,
    email: newUser.email,
    first_name: newUser.first_name,
    last_name: newUser.last_name,
  });
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string, example: "student@mail.com" }
 *               password: { type: string, example: "123456" }
 *     responses:
 *       200: { description: "Returns accessToken" }
 *       401: { description: "Invalid credentials" }
 */
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email);

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const accessToken = jwt.sign(
    { sub: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN },
  );
  res.json({ accessToken });
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: "Current user profile" }
 *       401: { description: "Unauthorized" }
 */
app.get("/api/auth/me", authMiddleware, (req, res) => {
  const user = users.find((u) => u.id === req.user.sub);
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json({
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
  });
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string, example: "Ноутбук" }
 *               category: { type: string, example: "Электроника" }
 *               description: { type: string, example: "Игровой ноутбук" }
 *               price: { type: number, example: 99000 }
 *     responses:
 *       201: { description: "Product created" }
 *       401: { description: "Unauthorized" }
 */
app.post("/api/products", authMiddleware, (req, res) => {
  const { title, category, description, price } = req.body;

  const newProduct = {
    id: crypto.randomUUID(),
    title,
    category,
    description,
    price,
  };

  products.push(newProduct);
  res.status(201).json(newProduct);
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     tags: [Products]
 *     responses:
 *       200: { description: "List of all products" }
 */
app.get("/api/products", (req, res) => {
  res.status(200).json(products);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: "Product found" }
 *       404: { description: "Product not found" }
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
 *     responses:
 *       200: { description: "Product updated" }
 *       404: { description: "Product not found" }
 */
app.put("/api/products/:id", authMiddleware, (req, res) => {
  const productIndex = products.findIndex((p) => p.id === req.params.id);
  if (productIndex === -1)
    return res.status(404).json({ error: "Product not found" });

  products[productIndex] = { ...products[productIndex], ...req.body };
  res.status(200).json(products[productIndex]);
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: "Product deleted" }
 *       404: { description: "Product not found" }
 */
app.delete("/api/products/:id", authMiddleware, (req, res) => {
  const productIndex = products.findIndex((p) => p.id === req.params.id);
  if (productIndex === -1)
    return res.status(404).json({ error: "Product not found" });

  products.splice(productIndex, 1);
  res.status(200).json({ message: "Product deleted" });
});

app.listen(port, () => {
  console.log(`Сервер запущен: http://localhost:${port}`);
  console.log(`Документация Swagger: http://localhost:${port}/api-docs`);
});
