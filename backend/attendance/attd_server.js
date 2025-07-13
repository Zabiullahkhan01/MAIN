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
  max: 100,                 // Limit each IP to 100 requests per windowMs
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
// Modified so that it searches by either driver_id or replacement_driver_id.
app.post('/api/attendance/checkin', (req, res) => {
  const { driver_id } = req.body;
  if (!driver_id) {
    return res.status(400).json({ error: 'driver_id is required' });
  }

  const now = getISTDate();
  const date = getLocalDateString(now);
  const check_in_time = getLocalDateTimeString(now);
  console.log(`Check-in request: driver_id=${driver_id}, date=${date}, time=${check_in_time}`);

  // Look up any record for today where driver_id OR replacement_driver_id matches.
  const selectSql =
    'SELECT id, check_in_time FROM attendance WHERE date = ? AND (driver_id = ? OR replacement_driver_id = ?)';
  pool.query(selectSql, [date, driver_id, driver_id], (err, results) => {
    if (err) {
      console.error('❌ Database error (check-in):', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (results.length > 0) {
      // If a record exists, update it only if check_in_time is not yet set.
      if (results[0].check_in_time) {
        console.log(`Driver ${driver_id} has already checked in on ${date}.`);
        return res.status(400).json({ error: 'Driver has already checked in today' });
      }
      const updateSql = 'UPDATE attendance SET check_in_time = ? WHERE id = ?';
      pool.query(updateSql, [check_in_time, results[0].id], (err, updateResult) => {
        if (err) {
          console.error('❌ Error updating check-in:', err.message);
          return res.status(500).json({ error: err.message });
        }
        console.log(`Check-in updated for driver ${driver_id} (record id ${results[0].id}).`);
        return res.status(200).json({ message: 'Check-in updated successfully' });
      });
    } else {
      // No record exists for today; insert a new attendance record.
      const insertSql = 'INSERT INTO attendance (driver_id, date, check_in_time) VALUES (?, ?, ?)';
      pool.query(insertSql, [driver_id, date, check_in_time], (err, insertResult) => {
        if (err) {
          console.error('❌ Error inserting check-in:', err.message);
          return res.status(500).json({ error: err.message });
        }
        console.log(`Check-in inserted for driver ${driver_id} (new record id ${insertResult.insertId}).`);
        return res.status(201).json({ message: 'Check-in successful', attendance_id: insertResult.insertId });
      });
    }
  });
});

// ---------- CHECK-OUT ENDPOINT ----------
// Modified so that it searches by either driver_id or replacement_driver_id.
app.post('/api/attendance/checkout', (req, res) => {
  const { driver_id } = req.body;
  if (!driver_id) {
    return res.status(400).json({ error: 'driver_id is required' });
  }

  const now = getISTDate();
  const date = getLocalDateString(now);
  const check_out_time = getLocalDateTimeString(now);
  console.log(`Check-out request: driver_id=${driver_id}, date=${date}, time=${check_out_time}`);

  const selectSql =
    'SELECT id, check_out_time FROM attendance WHERE date = ? AND (driver_id = ? OR replacement_driver_id = ?)';
  pool.query(selectSql, [date, driver_id, driver_id], (err, results) => {
    if (err) {
      console.error('❌ Database error (check-out):', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (results.length === 0) {
      console.log(`No check-in record found for driver ${driver_id} on ${date}.`);
      return res.status(400).json({ error: 'Driver has not checked in today' });
    }
    const record = results[0];
    if (record.check_out_time) {
      console.log(`Driver ${driver_id} already checked out on ${date}.`);
      return res.status(400).json({ error: 'Driver has already checked out today' });
    }
    const updateSql = 'UPDATE attendance SET check_out_time = ? WHERE id = ?';
    pool.query(updateSql, [check_out_time, record.id], (err, updateResults) => {
      if (err) {
        console.error('❌ Error updating check-out:', err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log(`Check-out updated for driver ${driver_id} (record id ${record.id}).`);
      return res.status(200).json({ message: 'Check-out successful' });
    });
  });
});

// ---------- DRIVER REPLACEMENT ENDPOINT ----------
// This endpoint preserves the original driver_id (for audit) and stores the
// replacement driver’s ID and replacement time in replacement_driver_id and replaced_at.
app.post('/api/attendance/replace', (req, res) => {
  const { originalDriverId, replacementDriverId } = req.body;
  if (!originalDriverId || !replacementDriverId) {
    return res.status(400).json({ error: 'originalDriverId and replacementDriverId are required' });
  }
  const now = getISTDate();
  const date = getLocalDateString(now);
  const replaced_at = getLocalDateTimeString(now);
  console.log(`Replacement request: originalDriverId=${originalDriverId}, replacementDriverId=${replacementDriverId}, date=${date}`);

  // Look up today's attendance record for the original driver.
  const selectSql = 'SELECT id, check_in_time FROM attendance WHERE driver_id = ? AND date = ?';
  pool.query(selectSql, [originalDriverId, date], (err, results) => {
    if (err) {
      console.error('❌ Database error (replacement select):', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    if (results.length > 0) {
      // If a record exists, ensure the driver has not yet checked in.
      if (results[0].check_in_time) {
        console.log(`Driver ${originalDriverId} has already checked in on ${date}; cannot replace.`);
        return res.status(400).json({ error: 'Driver has already checked in today, cannot replace' });
      }
      // Update only the replacement fields for audit.
      const updateSql = 'UPDATE attendance SET replacement_driver_id = ?, replaced_at = ? WHERE id = ?';
      pool.query(updateSql, [replacementDriverId, replaced_at, results[0].id], (err, updateResult) => {
        if (err) {
          console.error('❌ Database error (replacement update):', err.message);
          return res.status(500).json({ error: err.message });
        }
        console.log(`Replacement info updated for record id ${results[0].id}.`);
        return res.status(200).json({ message: 'Replacement recorded successfully (updated existing record)' });
      });
    } else {
      // If no record exists, insert a new row with both original and replacement info.
      const insertSql = 'INSERT INTO attendance (driver_id, date, replacement_driver_id, replaced_at) VALUES (?, ?, ?, ?)';
      pool.query(insertSql, [originalDriverId, date, replacementDriverId, replaced_at], (err, insertResult) => {
        if (err) {
          console.error('❌ Database error (replacement insert):', err.message);
          return res.status(500).json({ error: err.message });
        }
        console.log(`Replacement record inserted for originalDriverId ${originalDriverId} with replacement_driver_id ${replacementDriverId}. New record id: ${insertResult.insertId}`);
        return res.status(201).json({ message: 'Replacement recorded successfully (inserted new record)', attendance_id: insertResult.insertId });
      });
    }
  });
});

// ---------- ATTENDANCE MIGRATION ENDPOINT ----------
app.put('/api/attendance/migrate', (req, res) => {
  const { oldDriverId, newDriverId, date } = req.body;
  if (!oldDriverId || !newDriverId || !date) {
    return res.status(400).json({ error: 'oldDriverId, newDriverId, and date are required' });
  }
  console.log(`Migrating attendance: oldDriverId=${oldDriverId} to newDriverId=${newDriverId} for date=${date}`);
  const updateSql = 'UPDATE attendance SET driver_id = ? WHERE driver_id = ? AND date = ?';
  pool.query(updateSql, [newDriverId, oldDriverId, date], (err, results) => {
    if (err) {
      console.error('❌ Error updating attendance during migration:', err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`Migration successful. ${results.affectedRows} record(s) updated.`);
    return res.status(200).json({ message: 'Attendance migration successful', affectedRows: results.affectedRows });
  });
});


// ---------- GET ALL DRIVERS ----------
app.get('/api/drivers', (req, res) => {
  pool.query('SELECT driver_id, name, picture_url FROM drivers where job_type = "regular"', (err, results) => {
    if (err) {
      console.error('❌ Database error (fetching drivers):', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

// ---------- GET SPARE CREW DATA ----------
app.get('/api/drivers/:id', (req, res) => {
  const { id } = req.params;
  pool.query('SELECT driver_id, name, picture_url FROM drivers WHERE driver_id = ?', [id], (err, results) => {
    if (err) {
      console.error('❌ Database error (fetching driver):', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Driver not found or not a spare' });
    }
    res.json(results[0]);
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
        r.source_name, 
      r.destination_name, 
      r.source_latitude, 
      r.source_longitude,
      r.destination_latitude,
      r.destination_longitude,
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
        r.source_name, 
      r.destination_name, 
      r.source_latitude, 
      r.source_longitude,
      r.destination_latitude,
      r.destination_longitude,
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
      r.source_name, 
      r.destination_name, 
      r.source_latitude, 
      r.source_longitude,
      r.destination_latitude,
      r.destination_longitude,
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
      OR LOWER(r.source_name) LIKE LOWER(?)
      OR LOWER(r.destination_name) LIKE LOWER(?)
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


























