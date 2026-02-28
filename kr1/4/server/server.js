const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');
const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = 3000;

// === Данные: 10 товаров с URL-картинками ===
let products = [
    { id: nanoid(6), name: 'Ноутбук', category: 'Электроника', price: 50000, stock: 10, description: 'Мощный ноутбук', image: 'https://ae04.alicdn.com/kf/S9d6eb2557fe1428682021983d5cc4d28H.jpg_640x640.jpg' },
    { id: nanoid(6), name: 'Смартфон', category: 'Электроника', price: 30000, stock: 25, description: 'Современный смартфон', image: 'https://ae04.alicdn.com/kf/S9d6eb2557fe1428682021983d5cc4d28H.jpg_640x640.jpg' },
    { id: nanoid(6), name: 'Наушники', category: 'Аксессуары', price: 5000, stock: 50, description: 'Беспроводные наушники', image: 'https://ae04.alicdn.com/kf/S9d6eb2557fe1428682021983d5cc4d28H.jpg_640x640.jpg' },
    { id: nanoid(6), name: 'Клавиатура', category: 'Аксессуары', price: 7000, stock: 30, description: 'Механическая клавиатура', image: 'https://ae04.alicdn.com/kf/S9d6eb2557fe1428682021983d5cc4d28H.jpg_640x640.jpg' },

];

app.use(cors({
    origin: "http://localhost:3001",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));


app.use(express.json());

// 4. Логирование
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API Интернет-магазина',
            version: '1.0.0',
            description: 'REST API для управления товарами',
        },
        servers: [{ url: `http://localhost:${port}`, description: 'Локальный сервер' }],
    },
    apis: ['./server.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// === JSDoc Schema ===
/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required: [name, price]
 *       properties:
 *         id: { type: string, description: 'Уникальный ID' }
 *         name: { type: string, description: 'Название товара' }
 *         category: { type: string, description: 'Категория' }
 *         price: { type: integer, description: 'Цена в рублях' }
 *         stock: { type: integer, description: 'Количество на складе' }
 *         description: { type: string, description: 'Описание' }
 *         image: { type: string, description: 'URL изображения' }
 *       example:
 *         id: "abc123"
 *         name: "Ноутбук"
 *         category: "Электроника"
 *         price: 50000
 *         stock: 10
 *         description: "Мощный ноутбук"
 *         image: "https://example.com/image.jpg"
 */

// === Helper ===
function findProductOr404(id, res) {
    const product = products.find(p => p.id === id);
    if (!product) {
        res.status(404).json({ error: "Товар не найден" });
        return null;
    }
    return product;
}

// === CRUD Routes ===

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создать товар
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, price]
 *             properties:
 *               name: { type: string }
 *               category: { type: string }
 *               price: { type: integer }
 *               stock: { type: integer }
 *               description: { type: string }
 *               image: { type: string }
 *     responses:
 *       201:
 *         description: Товар создан
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Product' }
 */
app.post("/api/products", (req, res) => {
    try {
        const { name, category, price, stock, description, image } = req.body;
        if (!name || price === undefined) {
            return res.status(400).json({ error: "Название и цена обязательны" });
        }
        const newProduct = {
            id: nanoid(6),
            name: name.trim(),
            category: category || "Разное",
            price: Number(price),
            stock: Number(stock) || 0,
            description: description || "",
            image: image && image.trim() ? image.trim() : 'https://via.placeholder.com/300x200?text=No+Image'
        };
        products.push(newProduct);
        res.status(201).json(newProduct);
    } catch (err) {
        console.error('POST error:', err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Получить все товары
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Список товаров
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Product' }
 */
app.get("/api/products", (req, res) => {
    res.json(products);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Получить товар по ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema: { type: string }
 *         required: true
 *     responses:
 *       200:
 *         description: Данные товара
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Product' }
 *       404:
 *         description: Не найден
 */
app.get("/api/products/:id", (req, res) => {
    const product = findProductOr404(req.params.id, res);
    if (product) res.json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   patch:
 *     summary: Обновить товар
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema: { type: string }
 *         required: true
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               category: { type: string }
 *               price: { type: integer }
 *               stock: { type: integer }
 *               description: { type: string }
 *               image: { type: string }
 *     responses:
 *       200:
 *         description: Обновленный товар
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Product' }
 */
app.patch("/api/products/:id", (req, res) => {
    try {
        const product = findProductOr404(req.params.id, res);
        if (!product) return;
        
        const { name, category, price, stock, description, image } = req.body;
        if (name !== undefined) product.name = name.trim();
        if (category !== undefined) product.category = category;
        if (price !== undefined) product.price = Number(price);
        if (stock !== undefined) product.stock = Number(stock);
        if (description !== undefined) product.description = description;
        if (image !== undefined) {
            product.image = image && image.trim() ? image.trim() : 'https://via.placeholder.com/300x200?text=No+Image';
        }
        res.json(product);
    } catch (err) {
        console.error('PATCH error:', err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удалить товар
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema: { type: string }
 *         required: true
 *     responses:
 *       204:
 *         description: Удален
 *       404:
 *         description: Не найден
 */
app.delete("/api/products/:id", (req, res) => {
    try {
        const exists = products.some(p => p.id === req.params.id);
        if (!exists) return res.status(404).json({ error: "Товар не найден" });
        products = products.filter(p => p.id !== req.params.id);
        res.status(204).send();
    } catch (err) {
        console.error('DELETE error:', err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

// === Error Handlers ===
app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
});

// === Start ===
app.listen(port, () => {
    console.log(`✅ Сервер: http://localhost:${port}`);
    console.log(`📚 Swagger: http://localhost:${port}/api-docs`);
});