require("dotenv").config();
const express = require("express");
const { createPool } = require("mysql2");
const { json } = require("body-parser");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

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
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "your_password",
  database: process.env.DB_NAME || "authDB",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Check if database connection is successful
pool.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  } else {
    console.log("✅ Connected to MySQL database!");
    connection.release();
  }
});

// --- Utility Functions for Date/Time Formatting ---
function getLocalDateString(date) {
  return date.toISOString().split("T")[0]; // Format: YYYY-MM-DD
}

function getLocalDateTimeString(date) {
  return date.toISOString().slice(0, 19).replace("T", " "); // Format: YYYY-MM-DD HH:MM:SS
}

// ---------- CHECK-IN ENDPOINT ----------
app.post("/api/attendance/checkin", (req, res) => {
  const { driver_id } = req.body;
  if (!driver_id) {
    return res.status(400).json({ error: "driver_id is required" });
  }

  const now = new Date();
  const date = getLocalDateString(now);
  const check_in_time = getLocalDateTimeString(now);

  console.log(`🟢 Check-in request: driver_id=${driver_id}, date=${date}, check_in_time=${check_in_time}`);

  // Check if driver has already checked in today
  const selectSql = "SELECT id FROM attendance WHERE driver_id = ? AND date = ?";
  pool.query(selectSql, [driver_id, date], (err, results) => {
    if (err) {
      console.error("❌ Database error (check-in):", err);
      return res.status(500).json({ error: "Database error" });
    }
    if (results.length > 0) {
      console.log(`⚠️ Driver ${driver_id} has already checked in on ${date}.`);
      return res.status(400).json({ error: "Driver has already checked in today" });
    }

    // Insert check-in record
    const insertSql = "INSERT INTO attendance (driver_id, date, check_in_time) VALUES (?, ?, ?)";
    pool.query(insertSql, [driver_id, date, check_in_time], (err, results) => {
      if (err) {
        console.error("❌ Error inserting attendance (check-in):", err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log(`✅ Check-in successful for driver ${driver_id}. Record ID: ${results.insertId}`);
      res.status(201).json({ message: "Check-in successful", attendance_id: results.insertId });
    });
  });
});

// ---------- CHECK-OUT ENDPOINT ----------
app.post("/api/attendance/checkout", (req, res) => {
  const { driver_id } = req.body;
  if (!driver_id) {
    return res.status(400).json({ error: "driver_id is required" });
  }

  const now = new Date();
  const date = getLocalDateString(now);
  const check_out_time = getLocalDateTimeString(now);

  console.log(`🟢 Check-out request: driver_id=${driver_id}, date=${date}, check_out_time=${check_out_time}`);

  // Look for today's attendance record
  const selectSql = "SELECT id, check_out_time FROM attendance WHERE driver_id = ? AND date = ?";
  pool.query(selectSql, [driver_id, date], (err, results) => {
    if (err) {
      console.error("❌ Database error (check-out):", err);
      return res.status(500).json({ error: "Database error" });
    }
    if (results.length === 0) {
      console.log(`⚠️ No check-in record found for driver ${driver_id} on ${date}.`);
      return res.status(400).json({ error: "Driver has not checked in today" });
    }

    const record = results[0];
    if (record.check_out_time) {
      console.log(`⚠️ Driver ${driver_id} already checked out on ${date}.`);
      return res.status(400).json({ error: "Driver has already checked out today" });
    }

    // Update check-out time
    const updateSql = "UPDATE attendance SET check_out_time = ? WHERE id = ?";
    pool.query(updateSql, [check_out_time, record.id], (err, updateResults) => {
      if (err) {
        console.error("❌ Error updating attendance (check-out):", err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log(`✅ Check-out successful for driver ${driver_id}.`);
      res.status(200).json({ message: "Check-out successful" });
    });
  });
});

// ---------- GET ALL DRIVERS ----------
app.get("/api/drivers", (req, res) => {
  pool.query("SELECT driver_id, name, picture_url FROM drivers", (err, results) => {
    if (err) {
      console.error("❌ Database error (fetching drivers):", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

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
