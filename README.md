# 🚌 Automated Bus Scheduling and Route Management System
![License: Non-Commercial](https://img.shields.io/badge/license-Non--Commercial-lightgrey.svg)

This project presents a **smart, scalable, and real-time bus scheduling and route management system**. It integrates artificial intelligence, MySQL databases, and real-time location tracking to optimize bus allocations, crew assignments, and scheduling operations along with efficient route management and visualiztion of route(with its stops) with the help of google map api keys

---

## 📌 Key Features

- 🚦 **Genetic Algorithm-based scheduling**
  - Optimizes driver and bus allocation
  - Reduces redundant trips and balances workload
- 📍 **Live Geolocation Tracking**
  - Drivers can send emergency alerts with their exact GPS location during any breakdown or emergency
- 📊 **Role-Based Dashboards**
  - **Driver Dashboard**: Route selection, live alerts, route mapping
  - **Depo Master Dashboard**:schedule monitoring, Attendance management, crew substitution, Monitoring alerts
- 🔐 **Secure Login System**
  - JWT-based session management with bcrypt-hashed passwords
- 🗺️ **Google Maps API Integration**
  - Dynamic route rendering and real-time positioning
- 📂 **Modular Backend Architecture**
  - Python/Flask + Node/Express APIs
  - MySQL-backed relational data management
- 📈 **Real-time schedule adjustment**
  - Adapts to bus availability and passenger demand on the fly

---

## 🛠️ Technologies Used

### Backend
- Python / Flask
- Node.js / Express.js
- MySQL (relational database)
- APScheduler (job scheduling)
- Genetic Algorithm (via DEAP library)

### Frontend
- React.js
- CSS / HTML
- Google Maps API

### Tools
- JWT for secure authentication
- bcrypt for password hashing
- dotenv for managing environment variables

---

## 📦 Folder Structure

```
MAIN/
├── backend/
│   ├── auth/
│   ├── attendance/
│   ├── bus_schedule.py
│   ├── server.js
│   ├── .env (ignored in Git)
│   └── jobs.sqlite (ignored in Git)
├── bus/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── assets/
│   ├── public/
│   ├── App.jsx
│   └── .env (ignored in Git)
```

---

## 🧪 How It Works

- Depot masters define schedules and assign buses.
- Depo master keeps track of crew attendance and manages substitution of crew if needed.
- Drivers log in and view their assigned routes.
- Drivers can send real-time emergency alerts via geolocation.
- Depo master monitors and acts on Alert signals.
- At Depo master end all future schedules that include Hindered buses gets cancelled,
- The backend continuously optimizes assignments using a **genetic algorithm**, adapting to bus availability and peak-hour demand.

---

## 🔒 Security

- `.env` files are ignored in Git and include secrets like:
  - DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET
- JWT-based session authentication ensures secure role-based access

---

## 🚀 Setup Instructions

### Prerequisites:
- Node.js
- Python 3.x
- MySQL server

### Backend Setup:

```bash
cd backend                                 
pip install -r requirements.txt            # for Flask & scheduler
npm install                                # for Express APIs
node auth/server.js                        # or npm run start:auth
node attendance/attd_server.js             # or npm run start:attendance
python bus_schedule.py                     # for flask backend
```

### Frontend Setup:

```bash
cd bus
npm install
npm run dev                               # or npm start
```

Create a `.env` file in `/bus` and `/backend` as needed:

```
# Example: backend/.env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=authDB
JWT_SECRET=your_jwt_secret

# Example: bus/.env
VITE_GOOGLE_MAPS_API_KEY=your_google_api_key
```

---

## 📈 Future Enhancements

- 📱 Mobile app for drivers and depot masters
- 📍 Real-time GPS integration for passenger-side tracking
- 🚨 One click emergency Alert signal 
- 📡 Predictive scheduling using AI-driven demand forecasting
- 🧠 ML-based bus bunching prediction and resolution

---

## 🧠 Authors

- **Zabiullah Khan**          # zabiullah.khan2002@gmail.com
- **Ritik Maurya**
- **Jitesh Bharti**


> Project developed at D.Y. Patil Deemed University, Navi Mumbai

---

## 📄 License

This project is for academic and research use. For commercial licensing or contributions, please contact the authors.
