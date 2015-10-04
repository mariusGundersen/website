const express = require('express');
const static = require('express-static');
const app = express();

app.use(static('output'));

app.use((req, res, next) => res.sendFile(__dirname+'/output/404.html'));

app.listen(8080);