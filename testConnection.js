const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'ccscloud.dlsu.edu.ph',
  port: 20632,
  user: 'root2',
  password: 'Yq4eAs8gDucEdTwZ6bBKW9Jk',
  database: 'sys',
});

connection.connect(err => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Connected to the database.');
  }
  connection.end();
});