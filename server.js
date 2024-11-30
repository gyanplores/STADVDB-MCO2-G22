const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());

const connection = mysql.createConnection({
  host: 'ccscloud.dlsu.edu.ph',
  port: 20632,
  user: 'root2',
  password: 'Yq4eAs8gDucEdTwZ6bBKW9Jk',
  database: 'sys', 
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
    return;
  }
  console.log('Connected to the database.');
});

app.get('/data', (req, res) => {
  const query = 'SELECT * FROM games';
  connection.query(query, (err, results) => {
    if (err) {
      console.error('Database query failed:', err.message);
      res.status(500).send('Database query failed.');
    } else {
      res.json(results);
    }
  });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});