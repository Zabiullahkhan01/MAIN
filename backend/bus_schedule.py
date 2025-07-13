from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector
from datetime import datetime, timedelta
import math
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
import atexit
import os
from dotenv import load_dotenv

# ✅ Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

# ✅ Configure APScheduler to persist jobs in SQLite
jobstores = {
    'default': SQLAlchemyJobStore(url='sqlite:///jobs.sqlite')
}
scheduler = BackgroundScheduler(jobstores=jobstores)
scheduler.start()

# ✅ Connect to MySQL using environment variables
def connect_db():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME")
    )


@app.route('/api/buses', methods=['GET'])
def get_buses():
    """
    Retrieve all buses along with their current availability.
    For today's date, ensure every bus has a record in bus_availability with a default of 'Yes'
    if no record exists.
    """
    db = connect_db()
    cursor = db.cursor(dictionary=True)
    today = datetime.now().date()

    # Ensure every bus has an entry for today's date in bus_availability.
    cursor.execute("SELECT bus_id FROM bus")
    all_buses = cursor.fetchall()
    for bus in all_buses:
        cursor.execute(
            "SELECT 1 FROM bus_availability WHERE bus_id = %s AND date_ = %s",
            (bus['bus_id'], today)
        )
        if not cursor.fetchone():
            cursor.execute(
                "INSERT INTO bus_availability (bus_id, date_, available) VALUES (%s, %s, 'Yes')",
                (bus['bus_id'], today)
            )
    db.commit()

    # Retrieve availability for today.
    cursor.execute("""
        SELECT b.bus_id, ba.available
        FROM bus b
        JOIN bus_availability ba ON b.bus_id = ba.bus_id AND ba.date_ = %s
    """, (today,))
    buses = cursor.fetchall()
    cursor.close()
    db.close()
    return jsonify(buses)

@app.route('/api/updateAvailability', methods=['POST'])
def update_availability():
    """
    Update the availability of a bus.
    Expects JSON data with 'bus_id' and 'available' (either 'Yes' or 'No').
    """
    data = request.get_json()
    bus_id = data.get('bus_id')
    available = data.get('available')
    
    if not bus_id or available not in ['Yes', 'No']:
        return jsonify({'error': 'Invalid input. Provide bus_id and available ("Yes" or "No").'}), 400

    db = connect_db()
    cursor = db.cursor()
    cursor.execute("""
        INSERT INTO bus_availability (bus_id, date_, available)
        VALUES (%s, CURDATE(), %s)
        ON DUPLICATE KEY UPDATE available = VALUES(available)
    """, (bus_id, available))
    db.commit()
    cursor.close()
    db.close()
    return jsonify({'message': 'Availability updated successfully'}), 200

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    """
    Retrieve all alerts from the alerts table for the current date.
    """
    try:
        db = connect_db()
        cursor = db.cursor(dictionary=True)
        # Filter alerts to only include those for the current date.
        cursor.execute("SELECT busNo, message FROM alerts WHERE DATE(time) = CURDATE()")
        alerts = cursor.fetchall()
        cursor.close()
        db.close()
        return jsonify({"alerts": alerts}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def is_peak_hour(time_obj):
    """
    Returns True if time_obj falls within peak hours (6:00-9:00 and 17:00-21:00), else False.
    """
    if (time_obj >= datetime.strptime("06:00:00", "%H:%M:%S").time() and 
        time_obj < datetime.strptime("09:00:00", "%H:%M:%S").time()) or \
       (time_obj >= datetime.strptime("17:00:00", "%H:%M:%S").time() and 
        time_obj < datetime.strptime("21:00:00", "%H:%M:%S").time()):
        return True
    return False

def generate_schedule():
    """
    Generates today's schedule by assigning available buses and crew to routes.
    Instead of deleting previous entries, only missing entries are inserted into the schedules table.
    The entry stores:
      - bus_id (FK to bus)
      - route_id (FK to routes)
      - crew_id (FK to crew)
      - driver_name & conductor_name (from crew snapshot)
      - source_name & destination_name (from routes snapshot)
      - shift_time & schedule_date
    """
    db = connect_db()
    cursor = db.cursor(dictionary=True)
    
    # Retrieve available buses with depot and capacity.
    cursor.execute("""
        SELECT ba.bus_id, b.depot_id, b.capacity
        FROM bus_availability ba
        JOIN bus b ON ba.bus_id = b.bus_id
        WHERE ba.available = 'Yes' AND ba.date_ = CURDATE()
    """)
    available_buses = cursor.fetchall()
    
    # Retrieve crews (each row contains driver and conductor details).
    cursor.execute("""
        SELECT crew_id, driver_name, conductor_name, assigned_depot 
        FROM crew
    """)
    crews = cursor.fetchall()
    
    # Retrieve all routes with details.
    cursor.execute("""
        SELECT route_id, duration, peak_passengers_count_perhour, normal_passengers_count_perhour,
               source_name, destination_name
        FROM routes
    """)
    routes = cursor.fetchall()
    
    operating_start = datetime.strptime("04:00:00", "%H:%M:%S")
    end_time = datetime.strptime("23:59:59", "%H:%M:%S")
    
    # Initialize next available times for buses and crews.
    bus_next_available = {bus['bus_id']: operating_start for bus in available_buses}
    crew_next_available = {crew['crew_id']: operating_start for crew in crews}
    crew_worked_minutes = {crew['crew_id']: 0 for crew in crews}
    
    schedule_entries = []
    current_time = operating_start
    
    while current_time <= end_time:
        current_hour = current_time.time()
        hour_type = "Peak" if is_peak_hour(current_hour) else "Normal"
        
        if available_buses:
            avg_capacity = sum(bus['capacity'] for bus in available_buses) / len(available_buses)
        else:
            avg_capacity = 50  # fallback
        
        for route in routes:
            route_id = route['route_id']
            passengers = route['peak_passengers_count_perhour'] if hour_type == "Peak" else route['normal_passengers_count_perhour']
            frequency = max(1, math.ceil(passengers / avg_capacity))
            assignments = 0
            
            for bus in available_buses:
                if bus_next_available[bus['bus_id']] > current_time:
                    continue
                
                # Select a crew based on depot match and availability.
                selected_crew = None
                for crew in crews:
                    if crew['assigned_depot'] == bus['depot_id'] and \
                       crew_next_available[crew['crew_id']] <= current_time and \
                       crew_worked_minutes[crew['crew_id']] < 720:
                        selected_crew = crew
                        break
                if not selected_crew:
                    continue
                
                # Prepare the schedule entry.
                entry = {
                    'bus_id': bus['bus_id'],
                    'route_id': route_id,
                    'crew_id': selected_crew['crew_id'],
                    'driver_name': selected_crew['driver_name'],
                    'conductor_name': selected_crew['conductor_name'],
                    'source_name': route['source_name'],
                    'destination_name': route['destination_name'],
                    'shift_time': current_time.strftime("%H:%M:%S"),
                    'schedule_date': datetime.now().date().isoformat()
                }
                schedule_entries.append(entry)
                
                assignment_duration = timedelta(minutes=route['duration'] + 40)
                bus_next_available[bus['bus_id']] = current_time + assignment_duration
                crew_next_available[selected_crew['crew_id']] = current_time + assignment_duration
                crew_worked_minutes[selected_crew['crew_id']] += (route['duration'] + 40)
                assignments += 1
                if assignments >= frequency:
                    break
        
        current_time += timedelta(minutes=15)
    
    # Insert only missing schedule entries.
    for entry in schedule_entries:
        cursor.execute("""
            SELECT COUNT(*) as cnt FROM schedules 
            WHERE schedule_date = %s AND bus_id = %s AND shift_time = %s AND route_id = %s
        """, (entry['schedule_date'], entry['bus_id'], entry['shift_time'], entry['route_id']))
        exists = cursor.fetchone()
        if exists['cnt'] == 0:
            cursor.execute("""
                INSERT INTO schedules 
                    (bus_id, route_id, crew_id, driver_name, conductor_name, source_name, destination_name, shift_time, schedule_date)
                VALUES 
                    (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                entry['bus_id'],
                entry['route_id'],
                entry['crew_id'],
                entry['driver_name'],
                entry['conductor_name'],
                entry['source_name'],
                entry['destination_name'],
                entry['shift_time'],
                entry['schedule_date']
            ))
    
    db.commit()
    cursor.close()
    db.close()
    
    return schedule_entries

@app.route('/api/schedule', methods=['GET'])
def get_schedule():
    """
    Generates today's schedule using the scheduling logic, checks the alerts table,
    and returns the schedule data as JSON. If a bus is found in the alerts table for the current date,
    its availability is set to 'No' and the alert message is included.
    """
    try:
        schedule_entries = generate_schedule()
        
        # Fetch alerts for the current date from the alerts table
        db = connect_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT busNo, message FROM alerts WHERE DATE(time) = CURDATE()")
        alerts = cursor.fetchall()
        cursor.close()
        db.close()
        
        # Create a mapping from busNo to its alert message.
        alert_map = {}
        for alert in alerts:
            alert_map[str(alert['busNo'])] = alert['message']
        
        # Update each schedule entry with alert info if applicable.
        for entry in schedule_entries:
            if str(entry['bus_id']) in alert_map:
                entry['available'] = 'No'
                entry['alert_message'] = alert_map[str(entry['bus_id'])]
            else:
                entry['available'] = 'Yes'
                entry['alert_message'] = None

        return jsonify({
            "message": "Schedule generated successfully.",
            "schedule": schedule_entries
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

def daily_tasks():
    """
    Runs at the start of each new day:
      - Ensures every bus has a default 'Yes' availability record for today.
      - Generates the day's schedule (appending missing entries).
    """
    print("Running daily tasks for a new day...")
    today = datetime.now().date()
    
    db = connect_db()
    cursor = db.cursor()
    cursor.execute("SELECT bus_id FROM bus")
    all_buses = cursor.fetchall()
    for bus in all_buses:
        cursor.execute("SELECT 1 FROM bus_availability WHERE bus_id = %s AND date_ = %s", (bus[0], today))
        if not cursor.fetchone():
            cursor.execute("INSERT INTO bus_availability (bus_id, date_, available) VALUES (%s, %s, 'Yes')", (bus[0], today))
    db.commit()
    cursor.close()
    db.close()
    print("Bus availability updated for", today)
    
    schedule_entries = generate_schedule()
    print("New schedule generated for", today, "with", len(schedule_entries), "entries.")

# Add the daily_tasks job with an explicit ID and replace_existing flag.
scheduler.add_job(
    daily_tasks,
    trigger='cron',
    hour=2,
    minute=51,
    id='daily_tasks_job',
    replace_existing=True,
    misfire_grace_time=259200,  # 3 days grace period
    coalesce=True
)

atexit.register(lambda: scheduler.shutdown())

if __name__ == '__main__':
    app.run(debug=True, port=4000)

























