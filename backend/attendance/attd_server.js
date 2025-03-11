require('dotenv').config();
const express = require('express');
const { createPool } = require('mysql2');
const { json } = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const moment = require('moment-timezone');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(json());
app.use(cors());
app.use(helmet());

// Rate Limiting (Prevents brute-force attacks)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Debugging Middleware - Logs incoming requests
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

// Configure MySQL connection pool (Using Environment Variables)
const pool = createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'your_password',
  database: process.env.DB_NAME || 'authDB',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Check if database connection is successful
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  } else {
    console.log('✅ Connected to MySQL database!');
    connection.release();
  }
});

// --- Utility Functions for Date/Time Formatting ---
function getISTDate() {
  return moment().tz('Asia/Kolkata');
}

function getLocalDateString(date) {
  return date.format('YYYY-MM-DD'); // Format: YYYY-MM-DD
}

function getLocalDateTimeString(date) {
  return date.format('YYYY-MM-DD HH:mm:ss'); // Format: YYYY-MM-DD HH:MM:SS
}

// ---------- CHECK-IN ENDPOINT ----------
app.post('/api/attendance/checkin', (req, res) => {
  const { driver_id } = req.body;
  if (!driver_id) {
    return res.status(400).json({ error: 'driver_id is required' });
  }

  const now = getISTDate();
  const date = getLocalDateString(now);
  const check_in_time = getLocalDateTimeString(now);

  console.log(`🟢 Check-in request: driver_id=${driver_id}, date=${date}, check_in_time=${check_in_time}`);

  // Check if driver has already checked in today
  const selectSql = 'SELECT id FROM attendance WHERE driver_id = ? AND date = ?';
  pool.query(selectSql, [driver_id, date], (err, results) => {
    if (err) {
      console.error('❌ Database error (check-in):', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (results.length > 0) {
      console.log(`⚠️ Driver ${driver_id} has already checked in on ${date}.`);
      return res.status(400).json({ error: 'Driver has already checked in today' });
    }

    // Insert check-in record
    const insertSql = 'INSERT INTO attendance (driver_id, date, check_in_time) VALUES (?, ?, ?)';
    pool.query(insertSql, [driver_id, date, check_in_time], (err, results) => {
      if (err) {
        console.error('❌ Error inserting attendance (check-in):', err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log(`✅ Check-in successful for driver ${driver_id}. Record ID: ${results.insertId}`);
      res.status(201).json({ message: 'Check-in successful', attendance_id: results.insertId });
    });
  });
});

// ---------- CHECK-OUT ENDPOINT ----------
app.post('/api/attendance/checkout', (req, res) => {
  const { driver_id } = req.body;
  if (!driver_id) {
    return res.status(400).json({ error: 'driver_id is required' });
  }

  const now = getISTDate();
  const date = getLocalDateString(now);
  const check_out_time = getLocalDateTimeString(now);

  console.log(`🟢 Check-out request: driver_id=${driver_id}, date=${date}, check_out_time=${check_out_time}`);

  // Look for today's attendance record
  const selectSql = 'SELECT id, check_out_time FROM attendance WHERE driver_id = ? AND date = ?';
  pool.query(selectSql, [driver_id, date], (err, results) => {
    if (err) {
      console.error('❌ Database error (check-out):', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (results.length === 0) {
      console.log(`⚠️ No check-in record found for driver ${driver_id} on ${date}.`);
      return res.status(400).json({ error: 'Driver has not checked in today' });
    }

    const record = results[0];
    if (record.check_out_time) {
      console.log(`⚠️ Driver ${driver_id} already checked out on ${date}.`);
      return res.status(400).json({ error: 'Driver has already checked out today' });
    }

    // Update check-out time
    const updateSql = 'UPDATE attendance SET check_out_time = ? WHERE id = ?';
    pool.query(updateSql, [check_out_time, record.id], (err, updateResults) => {
      if (err) {
        console.error('❌ Error updating attendance (check-out):', err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log(`✅ Check-out successful for driver ${driver_id}.`);
      res.status(200).json({ message: 'Check-out successful' });
    });
  });
});

// ---------- GET ALL DRIVERS ----------
app.get('/api/drivers', (req, res) => {
  pool.query('SELECT driver_id, name, picture_url FROM drivers', (err, results) => {
    if (err) {
      console.error('❌ Database error (fetching drivers):', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
});     
 
});



//.................DRIVER_ROUTES......................................................
//....................................................................................
// API endpoint to fetch routes (with stops data)
// If lat and lng are provided, returns routes within a 5 km radius based on source_lat/source_lng.
// Also supports an optional "limit" parameter.
app.get('/api/routes', (req, res) => {
  const { lat, lng, limit } = req.query;
  const radius = 5; // radius in kilometers

  let query = '';
  let params = [];

  if (lat && lng) {
    // Query for nearby routes
    query = `
      SELECT 
        r.route_id, 
        r.route_name, 
        r.source, 
        r.destination, 
        r.source_lat, 
        r.source_lng,
        r.destination_lat,
        r.destination_lng,
        (6371 * acos( 
          cos( radians(?) ) * cos( radians(r.source_lat) ) * 
          cos( radians(r.source_lng) - radians(?) ) + 
          sin( radians(?) ) * sin( radians(r.source_lat) )
        )) AS distance,
        (
          SELECT JSON_ARRAYAGG(ordered.stop_json)
          FROM (
            SELECT JSON_OBJECT(
              'stop_id', s.stop_id,
              'stop_name', s.stop_name,
              'stop_lat', s.stop_lat,
              'stop_lng', s.stop_lng,
              'stop_order', rs.stop_order
            ) AS stop_json
            FROM route_stops rs
            JOIN stops s ON rs.stop_id = s.stop_id
            WHERE rs.route_id = r.route_id
            ORDER BY rs.stop_order
          ) AS ordered
        ) AS stops
      FROM routes r
      HAVING distance < ?
      ORDER BY distance
      ${limit ? 'LIMIT ?' : ''}
    `;
    // Parameters order: lat, lng, lat, radius, (optional limit)
    params = limit ? [lat, lng, lat, radius, parseInt(limit)] : [lat, lng, lat, radius];
  } else {
    // Query for all routes
    query = `
      SELECT 
        r.route_id, 
        r.route_name, 
        r.source, 
        r.destination, 
        r.source_lat, 
        r.source_lng,
        r.destination_lat,
        r.destination_lng,
        (
          SELECT JSON_ARRAYAGG(ordered.stop_json)
          FROM (
            SELECT JSON_OBJECT(
              'stop_id', s.stop_id,
              'stop_name', s.stop_name,
              'stop_lat', s.stop_lat,
              'stop_lng', s.stop_lng,
              'stop_order', rs.stop_order
            ) AS stop_json
            FROM route_stops rs
            JOIN stops s ON rs.stop_id = s.stop_id
            WHERE rs.route_id = r.route_id
            ORDER BY rs.stop_order
          ) AS ordered
        ) AS stops
      FROM routes r
      ${limit ? 'LIMIT ?' : ''}
    `;
    params = limit ? [parseInt(limit)] : [];
  }

  pool.query(query, params, (err, results) => {
    if (err) {
      console.error('Error executing query:', err);
      return res.status(500).json({ error: 'Database error', details: err });
    }
    // Ensure stops is always an array
    results.forEach(route => {
      if (route.stops === null) route.stops = [];
    });
    res.json(results);
  });
});




// Search endpoint that looks through route details and associated stops.
app.get('/api/routes/search', (req, res) => {
  const { stops } = req.query;
  if (!stops) {
    return res.status(400).json({ error: 'Missing search parameter' });
  }
  const searchTerm = `%${stops}%`;

  const query = `
    SELECT DISTINCT 
      r.route_id, 
      r.route_name, 
      r.source, 
      r.destination, 
      r.source_lat, 
      r.source_lng,
      r.destination_lat,
      r.destination_lng,
      (
        SELECT JSON_ARRAYAGG(ordered.stop_json)
        FROM (
          SELECT JSON_OBJECT(
            'stop_id', s.stop_id,
            'stop_name', s.stop_name,
            'stop_lat', s.stop_lat,
            'stop_lng', s.stop_lng,
            'stop_order', rs.stop_order
          ) AS stop_json
          FROM route_stops rs
          JOIN stops s ON rs.stop_id = s.stop_id
          WHERE rs.route_id = r.route_id
          ORDER BY rs.stop_order
        ) AS ordered
      ) AS stops
    FROM routes r
    WHERE 
      LOWER(r.route_name) LIKE LOWER(?)
      OR LOWER(r.source) LIKE LOWER(?)
      OR LOWER(r.destination) LIKE LOWER(?)
      OR CAST(r.route_id AS CHAR) LIKE ?
      OR EXISTS (
          SELECT 1 
          FROM route_stops rs 
          JOIN stops s ON rs.stop_id = s.stop_id
          WHERE rs.route_id = r.route_id 
            AND LOWER(s.stop_name) LIKE LOWER(?)
      )
  `;

  pool.query(query, [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm], (err, results) => {
    if (err) {
      console.error('Error executing search query:', err);
      return res.status(500).json({ error: 'Database error', details: err });
    }
    results.forEach(route => {
      if (route.stops === null) route.stops = [];
    });
    res.json(results);
  });
});



//..............................................................................

// Start the server
app.listen(port, () => {
  console.log(`🚀 Attendance API server is running on http://localhost:${port}`);
});

























// // server.js
// // import express from 'express';
// // import { json } from 'body-parser';
// // import { createPool } from 'mysql2';
// // import cors from 'cors';
// const express = require("express");
// const { createPool } = require("mysql2");
// const { json } = require("body-parser");
// const cors = require("cors");

// const app = express();
// const port = process.env.PORT || 3001;

// app.use(json());
// app.use(cors());

// // Configure MySQL connection pool.
// const pool = createPool({
//   host: 'localhost',           // Replace with your MySQL host
//   user: 'root',        // Replace with your DB user
//   password: 'Zabi12345',// Replace with your DB password
//   database: 'authDB',   // Your database name
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0
// });

// // GET endpoint: fetch all driver details.
// app.get('/api/drivers', (req, res) => {
//   pool.query('SELECT driver_id, name, picture_url FROM drivers', (err, results) => {
//     if (err) {
//       console.error("Database error:", err);
//       return res.status(500).json({ error: 'Database error' });
//     }
//     res.json(results);
//   });
// });

// // POST endpoint: mark attendance for a driver.
// app.post('/api/attendance', (req, res) => {
//   const { driver_id } = req.body;
//   if (!driver_id) {
//     return res.status(400).json({ error: 'driver_id is required' });
//   }
  
//   const now = new Date();
//   // Format the date as YYYY-MM-DD.
//   const date = now.toISOString().split('T')[0];
//   // Format the timestamp as YYYY-MM-DD HH:MM:SS (dropping milliseconds and the trailing "Z").
//   const check_in_time = now.toISOString().replace('T', ' ').split('.')[0];
  
//   const sql = `INSERT INTO attendance (driver_id, date, check_in_time)
//                VALUES (?, ?, ?)`;
//   pool.query(sql, [driver_id, date, check_in_time], (err, results) => {
//     if (err) {
//       console.error("Error inserting attendance:", err.message);
//       return res.status(500).json({ error: err.message });
//     }
//     res.status(201).json({ message: 'Attendance marked', attendance_id: results.insertId });
//   });
// });


// app.listen(port, () => {
//   console.log(`Attendance API server is running on port ${port}`);
// });
