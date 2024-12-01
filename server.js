const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Server0 connection
const primaryConnection = mysql.createConnection({
  host: 'ccscloud.dlsu.edu.ph',
  port: 20632,
  user: 'root2',
  password: 'Yq4eAs8gDucEdTwZ6bBKW9Jk',
  database: 'sys',
});

// Server1 and Server2 connections
const secondaryConnection1 = mysql.createConnection({
  host: 'ccscloud.dlsu.edu.ph',
  port: 20642,
  user: 'root2',
  password: 'Yq4eAs8gDucEdTwZ6bBKW9Jk',
  database: 'sys',
});

const secondaryConnection2 = mysql.createConnection({
  host: 'ccscloud.dlsu.edu.ph',
  port: 20652,
  user: 'root2',
  password: 'Yq4eAs8gDucEdTwZ6bBKW9Jk',
  database: 'sys',
});

// Connect to the primary database
primaryConnection.connect((err) => {
  if (err) {
    console.error('Error connecting to the primary database:', err.message);
    return;
  }
  console.log('Connected to the primary database.');
});

// Endpoint to fetch data
app.get('/data', (req, res) => {
  const query = 'SELECT * FROM games';
  primaryConnection.query(query, (err, results) => {
    if (err) {
      console.error('Database query failed:', err.message);
      res.status(500).send('Database query failed.');
    } else {
      res.json(results);
    }
  });
});

// Endpoint to insert data
app.post('/insert', (req, res) => {
  const { appID, name, release_year } = req.body;

  if (!appID || !name || !release_year) {
    return res.status(400).send('Missing required fields: appID, name, or release_year.');
  }

  // Insert into primary node
  const insertPrimaryQuery = `
    INSERT INTO games (appID, name, release_year)
    VALUES (?, ?, ?)
  `;
  primaryConnection.query(insertPrimaryQuery, [appID, name, release_year], (err) => {
    if (err) {
      console.error('Failed to insert into primary database:', err.message);
      return res.status(500).send('Failed to insert into primary database.');
    }

    console.log('Data successfully inserted into primary database.');

    // Determine which secondary node to write to
    const secondaryConnection =
      release_year < 2010 ? secondaryConnection1 : secondaryConnection2;

    const insertSecondaryQuery = `
      INSERT INTO games (appID, name, release_year)
      VALUES (?, ?, ?)
    `;
    secondaryConnection.query(insertSecondaryQuery, [appID, name, release_year], (err) => {
      if (err) {
        console.error('Failed to insert into secondary database:', err.message);
        return res.status(500).send('Failed to insert into secondary database.');
      }

      console.log('Data successfully replicated to secondary database.');
      res.status(200).send('Data inserted and replicated successfully.');
    });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
