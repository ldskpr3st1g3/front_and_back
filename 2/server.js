// server.js
const express = require('express');
const app = express();
const PORT = 3001;

// парс json
app.use(express.json());

// База данных (муляж)
let products = [
  { id: 1, name: 'Генадий 1', price: 10 },
  { id: 2, name: 'Кракадил 2', price: 25 }
];

// Счетчик для новых ID
let nextId = 3;

// _получатор все товары
app.get('/products', (req, res) => 
    {
  res.json(products);
});

// получатор
app.get('/products/:id', (req, res) => 
    {
  const id = parseInt(req.params.id);
  const product = products.find(p => p.id === id);
  
  if (!product) {
    return res.status(404).json({ error: 'Генадия тут нет, ищите в другом месте ' });
  }
  
  res.json(product);
});

// добавлятор
app.post('/products', (req, res) => 
    {
  const { name, price } = req.body;
  
  if (!name || typeof price !== 'number') {
    return res.status(400).json({ error: 'такого Гены нет' });
  }
  
  const newProduct = {
    id: nextId++,
    name,
    price
  };
  
  products.push(newProduct);
  res.status(201).json(newProduct);
});

// редактатор
app.put('/products/:id', (req, res) => 
    {
  const id = parseInt(req.params.id);
  const { name, price } = req.body;
  
  const index = products.findIndex(p => p.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'нет тут никакого Гены' });
  }
  
  if (name) products[index].name = name;
  if (typeof price === 'number') products[index].price = price;
  
  res.json(products[index]);
});

// удалятор
app.delete('/products/:id', (req, res) => 
    {
  const id = parseInt(req.params.id);
  const index = products.findIndex(p => p.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Генадии здесь не водятся' });
  }
  
  const deleted = products.splice(index, 1);
  res.json(deleted[0]);
});

// Запускатор
app.listen(PORT, () => 
    {
  console.log(`Сервер запущен на порту ${PORT}`);
});