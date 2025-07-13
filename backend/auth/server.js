const express = require("express");
const { createPool } = require('mysql2');
const jwt = require("jsonwebtoken");
const cors = require("cors");
require('dotenv').config();

const app = express();
const PORT = 5000;
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key"; // Keep this secret
// Middleware
app.use(cors());
app.options('*', cors());


app.use(express.json());

// MySQL connection
// Configure MySQL connection pool (Using Environment Variables)
const db = createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'your_password',
  database: process.env.DB_NAME || 'authDB',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Check if database connection is successful
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  } else {
    console.log('✅ Connected to MySQL database!');
    connection.release();
  }
});

// Register User (No Password Hashing)
// app.post("/register", (req, res) => {
//   const { username, password, role } = req.body;

//   // Default role if not provided
//   const userRole = role || "user";

//   // Insert user into database
//   db.query(
//     "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
//     [username, password, userRole],
//     (err) => {
//       if (err) {
//         if (err.code === "ER_DUP_ENTRY") {
//           return res.status(400).json({ message: "User already exists" });
//         }
//         console.error(err);
//         return res.status(500).json({ error: "Database error" });
//       }
//       res.status(201).json({ message: "User registered successfully" });
//     }
//   );
// });

// Login Route
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  // Find the user in database
  db.query(
    "SELECT * FROM users WHERE username = ? AND password = ?",
    [username, password],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Database error" });
      }

      if (results.length === 0) {
        return res.status(400).json({ message: "Invalid username or password" });
      }

      const user = results[0];

      // Generate JWT Token
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: "1h" }
      );

      res.json({ token, role: user.role });
    }
  );
});

// Middleware to Verify Token
const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(403).json({ message: "Token required" });

  jwt.verify(token.split(" ")[1], JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Invalid token" });
    req.user = decoded;
    next();
  });
};

// Driver Dashboard Route
app.get("/driver-dashboard", verifyToken, (req, res) => {
  if (req.user.role !== "driver") {
    return res.status(403).json({ message: "Access denied" });
  }
  res.json({ message: "Welcome to Driver Dashboard!" });
});

// Depo-Master Dashboard Route
app.get("/depo-master-dashboard", verifyToken, (req, res) => {
  if (req.user.role !== "depo-master") {
    return res.status(403).json({ message: "Access denied" });
  }
  res.json({ message: "Welcome to Depo Master Dashboard!" });
});




//................alerting system calls...................................................................
//.........................................................................................................
// Endpoint to insert a new alert
app.post('/api/alerts', (req, res) => {
  let { busNo, route, source, destination, message, location, time } = req.body;
  if (!busNo || !route || !source || !destination || !message || !location || !time) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  // Directly use the time provided by the client (already in IST)
  const insertQuery = `
    INSERT INTO alerts (busNo, route, \`source\`, destination, message, location, \`time\`)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(insertQuery, [busNo, route, source, destination, message, location, time], (err, results) => {
    if (err) {
      console.error('Error inserting alert:', err);
      return res.status(500).json({ error: 'Database insertion failed.' });
    }
    res.status(201).json({ message: 'Alert created successfully!', id: results.insertId });
  });
});


// Endpoint to retrieve all alerts
app.get('/api/alerts', (req, res) => {
  const selectQuery = `SELECT * FROM alerts ORDER BY time DESC`;
    db.query(selectQuery, (err, results) => {
    if (err) {
      console.error('Error fetching alerts:', err);
      return res.status(500).json({ error: 'Database query failed.' });
    }
    res.json(results);
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});



















// const express = require("express");
// const mysql = require("mysql2");
// const bcrypt = require("bcrypt");
// const jwt = require("jsonwebtoken");
// const cors = require("cors");

// const app = express();
// const PORT = 5000;
// const JWT_SECRET =
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywiZXhwIjoxNjk5MjM5NzUwfQ.sdx4yKpWm6dqjBhFQ9P5rPb1R6u3LgxJshQ9WxLfFqo"; // Replace with a secure key

// // Middleware
// app.use(cors());
// app.use(express.json());

// // MySQL connection
// const db = mysql.createConnection({
//   host: "localhost",
//   user: "root", // Replace with your MySQL username
//   password: "Zabi12345", // Replace with your MySQL password
//   database: "authDB", // Replace with your database name
// });

// db.connect((err) => {
//   if (err) {
//     console.error("Error connecting to MySQL:", err);
//     return;
//   }
//   console.log("Connected to MySQL");
// });

// // Create users table if it doesn't exist
// const createUsersTable = `
//   CREATE TABLE IF NOT EXISTS users (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     username VARCHAR(255) NOT NULL UNIQUE,
//     password VARCHAR(255) NOT NULL
//   )
// `;
// db.query(createUsersTable, (err) => {
//   if (err) throw err;
//   console.log("Users table ready");
// });

// // Routes

// // Register route
// // app.post('/register', async (req, res) => {
// //   const { username, password } = req.body;

// //   try {
// //     // Check if the user already exists
// //     db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
// //       if (err) throw err;

// //       if (results.length > 0) {
// //         return res.status(400).json({ message: 'User already exists' });
// //       }

// //       // Hash the password
// //       const hashedPassword = await bcrypt.hash(password, 10);

// //       // Insert the user into the database
// //       db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (err) => {
// //         if (err) throw err;
// //         res.status(201).json({ message: 'User registered successfully' });
// //       });
// //     });
// //   } catch (error) {
// //     res.status(500).json({ error: 'Internal server error' });
// //   }
// // });

// // Login route
// app.post("/login", async (req, res) => {
//   const { username, password } = req.body;

//   try {
//     // Find the user
//     db.query(
//       "SELECT * FROM users WHERE username = ?",
//       [username],
//       async (err, results) => {
//         if (err) throw err;

//         if (results.length === 0) {
//           return res
//             .status(400)
//             .json({ message: "Invalid username or password" });
//         }

//         // Compare the password
//         //   const isPasswordValid = await bcrypt.compare(password, user.password);
//         const user = users.find(
//           (u) => u.username === username && u.password === password
//         );

//         if (!user) {
//           return res
//             .status(401)
//             .json({ message: "Invalid username or password" });
//         }

//         // Generate JWT Token
//         const token = jwt.sign(
//           { id: user.id, username: user.username, role: user.role },
//           SECRET_KEY,
//           {
//             expiresIn: "1h",
//           }
//         );

//         res.json({ token, role: user.role });
//       }
//     );
//   } catch (error) {
//     res.status(500).json({ error: "Internal server error" });
//   }
// });


// // Protected Route Middleware
// const verifyToken = (req, res, next) => {
//     const token = req.headers["authorization"];
//     if (!token) return res.status(403).json({ message: "Token required" });
  
//     jwt.verify(token.split(" ")[1], SECRET_KEY, (err, decoded) => {
//       if (err) return res.status(401).json({ message: "Invalid token" });
//       req.user = decoded;
//       next();
//     });
//   };


// // Protected route (example)
// // Driver Route
// app.get("/driver-dashboard", verifyToken, (req, res) => {
//   if (req.user.role !== "driver") return res.status(403).json({ message: "Access denied" });
//   res.json({ message: "Welcome to Driver Dashboard!" });
// });

// // Depo-Master Route
// app.get("/depo-master-dashboard", verifyToken, (req, res) => {
//   if (req.user.role !== "depo-master") return res.status(403).json({ message: "Access denied" });
//   res.json({ message: "Welcome to Depo Master Dashboard!" });
// });

// // Start the server
// app.listen(PORT, () => {
//   console.log(`Server running on http://localhost:${PORT}`);
// });
