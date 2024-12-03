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
  database: 'stadvdb',
});

// Server1 connection
const secondaryConnection1 = mysql.createConnection({
  host: 'ccscloud.dlsu.edu.ph',
  port: 20642,
  user: 'root2',
  password: 'Yq4eAs8gDucEdTwZ6bBKW9Jk',
  database: 'stadvdb',
});

// Server2 connection
const secondaryConnection2 = mysql.createConnection({
  host: 'ccscloud.dlsu.edu.ph',
  port: 20652,
  user: 'root2',
  password: 'Yq4eAs8gDucEdTwZ6bBKW9Jk',
  database: 'stadvdb',
});

// Connect to the primary database
primaryConnection.connect((err) => {
  if (err) {
    console.error('Error connecting to the primary database:', err.message);
    return;
  }
  console.log('Connected to the primary database.');
});

// Middleware to handle database errors
app.use((err, req, res, next) => {
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.error('Database connection was closed.');
    res.status(500).send('Database connection lost.');
  } else if (err.code === 'ER_CON_COUNT_ERROR') {
    console.error('Database has too many connections.');
    res.status(500).send('Database has too many connections.');
  } else if (err.code === 'ECONNREFUSED') {
    console.error('Database connection was refused.');
    res.status(500).send('Database connection refused.');
  } else {
    next(err);
  }
});

function ensureConnection(connection, res, callback) {
  if (!connection || connection.state === 'disconnected') {
    console.error('Attempted operation on disconnected database.');
    return res.status(500).send('Database connection lost.');
  }
  callback();
}

// Endpoint to fetch data (based on node)
app.get('/data', (req, res) => {
  const { node } = req.query;
  let connection = primaryConnection; // Default to primary connection

  console.log(`Fetching data for Node ${node}`);

  // Select the connection based on the node
  if (node === '1') {
    connection = secondaryConnection1;
    console.log('Using secondary connection 1');
  } else if (node === '2') {
    connection = secondaryConnection2;
    console.log('Using secondary connection 2');
  } else {
    console.log('Using primary connection');
  }

  ensureConnection(connection, res, () => {
    const query = 'SELECT * FROM games';
    connection.query(query, (err, results) => {
      if (err) {
        console.error('Database query failed:', err.message);
        return res.status(500).send('Database query failed.');
      }
      res.json(results);
    });
  });
});

// Endpoint to insert data (based on node)
app.post('/insert', (req, res) => {
  const { appID, name, release_year, node } = req.body;

  if (!appID || !name || !release_year || node === undefined) {
    return res.status(400).send('Missing required fields: appID, name, release_year, or node.');
  }

  let connection = primaryConnection; // Default to primary connection

  console.log(`Inserting data for Node ${node}`);
  console.log(`Inserting: appID=${appID}, name=${name}, release_year=${release_year}`);

  // Select the connection based on the node
  if (node === 1) {
    connection = secondaryConnection1;
    console.log('Using secondary connection 1');
  } else if (node === 2) {
    connection = secondaryConnection2;
    console.log('Using secondary connection 2');
  } else {
    console.log('Using primary connection');
  }

  const insertQuery = `
    INSERT INTO games (appID, name, release_year)
    VALUES (?, ?, ?)
  `;
  connection.query(insertQuery, [appID, name, release_year], (err) => {
    if (err) {
      console.error('Failed to insert into the selected database:', err.message);
      return res.status(500).send('Failed to insert into the selected database.');
    }

    console.log('Data successfully inserted into the selected database.');
    res.status(200).send('Data inserted successfully.');
  });
});

// Endpoint to search games (by year, app ID, or name)
app.get('/search', (req, res) => {
  const { release_year, appID, name, node } = req.query;

  let connection = primaryConnection;

  console.log(`Searching with params - Year: ${release_year}, App ID: ${appID}, Name: ${name} on Node ${node}`);

  if (node === '1') {
    connection = secondaryConnection1;
    console.log('Using secondary connection 1');
  } else if (node === '2') {
    connection = secondaryConnection2;
    console.log('Using secondary connection 2');
  } else {
    console.log('Using primary connection');
  }

  let searchQuery = 'SELECT * FROM games WHERE 1=1';
  const params = [];

  if (release_year) {
    searchQuery += ' AND release_year = ?';
    params.push(release_year);
  }

  if (appID) {
    searchQuery += ' AND appID = ?';
    params.push(appID);
  }

  if (name) {
    searchQuery += ' AND name LIKE ?';
    params.push(`%${name}%`);
  }

  connection.query(searchQuery, params, (err, results) => {
    if (err) {
      console.error('Failed to query database:', err.message);
      return res.status(500).send('Failed to query database.');
    }

    res.json(results);
  });
});

// Endpoint to update data (based on node)
app.put('/update', (req, res) => {
  const { appID, name, release_year, node } = req.body;

  if (!appID || node === undefined) {
    return res.status(400).send('Missing required fields: appID or node.');
  }

  let connection = primaryConnection;

  if (node === 1) {
    connection = secondaryConnection1;
  } else if (node === 2) {
    connection = secondaryConnection2;
  }

  let updateQuery = 'UPDATE games SET';
  const params = [];

  if (name) {
    updateQuery += ' name = ?,';
    params.push(name);
  }
  if (release_year) {
    updateQuery += ' release_year = ?,';
    params.push(release_year);
  }

  if (params.length === 0) {
    return res.status(400).send('No fields provided to update.');
  }

  updateQuery = updateQuery.slice(0, -1); // Remove trailing comma
  updateQuery += ' WHERE appID = ?';
  params.push(appID);

  connection.query(updateQuery, params, (err) => {
    if (err) {
      console.error('Failed to update the database:', err.message);
      return res.status(500).send('Failed to update the database.');
    }

    res.status(200).send('Data updated successfully.');
  });
});

// Endpoint to delete data (based on node)
app.delete('/delete', (req, res) => {
  const { appID, node } = req.body;

  if (!appID || node === undefined) {
    return res.status(400).send('Missing required fields: appID or node.');
  }

  let connection = primaryConnection;

  if (node === 1) {
    connection = secondaryConnection1;
  } else if (node === 2) {
    connection = secondaryConnection2;
  }

  const deleteQuery = 'DELETE FROM games WHERE appID = ?';

  console.log(`Deleting App ID ${appID} from Node ${node}`);

  connection.query(deleteQuery, [appID], (err) => {
    if (err) {
      console.error('Failed to delete from the database:', err.message);
      return res.status(500).send('Failed to delete from the database.');
    }

    res.status(200).send('Data deleted successfully.');
  });
});


// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
