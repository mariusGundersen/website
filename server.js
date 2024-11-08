const express = require('express');
const compression = require('compression');
const app = express();

app.use(compression());

app.use(express.static('output', {
  etag: false,
  lastModified: false,
  maxAge: '1d'
}));

app.use((req, res, next) => res.sendFile(__dirname+'/output/404.html'));

app.listen(8080);
