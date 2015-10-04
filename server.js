const express = require('express');
const static = require('express-static');
const app = express();

app.use(static('output'));

app.listen(8080);