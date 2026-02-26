const express = require('express');
const app = express();
const port = 3000;

let users = [
    {id: 1, name:'Петр', age: 16},
    {id: 2, name:'Иван', age: 18},
    {id: 3, name:'Дарья', age: 20},
];

app.use(express.json());

app.get('/', (req, res) => { res.send('Главная страница'); });
app.get('/users', (req, res) => { res.send(JSON.stringify(users)); });
app.get('/users/:id', (req, res) => {
    let user = users.find(u => u.id == req.params.id);
    res.send(JSON.stringify(user));
});
app.post('/users', (req, res) => {
    const { name, age } = req.body;
    const newUser = { id: Date.now(), name, age };
    users.push(newUser);
    res.status(201).json(newUser);
});
// (Остальные методы put/patch/delete можно добавить по аналогии, если нужно, но для задания хватит основных)

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});