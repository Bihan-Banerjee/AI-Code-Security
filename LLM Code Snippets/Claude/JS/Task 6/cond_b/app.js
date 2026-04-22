// app.js — wiring it all together
const express = require('express');
const protectedRoutes = require('./routes/protected');

const app = express();
app.use(express.json());
app.use('/api', protectedRoutes);

app.listen(3000);