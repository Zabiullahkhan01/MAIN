import React from 'react';
import '../css/alertCard.css';

/**
 * Attempt to parse a timestamp in the format:
 *   "YYYY-MM-DD HH:MM:SS" (optionally with "IST" or extra spaces),
 *   or "YYYY-MM-DDTHH:MM:SS" (optionally with +05:30).
 * Returns a Date object representing that instant in IST, or null if parsing fails.
 */
function parseISTTimestamp(ts) {
  if (!ts) return null;

  // 1) Trim extra spaces, remove "IST" if present.
  ts = ts.replace(/IST/i, '').trim(); 
  // Example result: "2025-03-05 06:16:37" or "2025-03-05T06:16:37"

  // 2) If it already has a 'T' and a timezone offset, just parse directly.
  //    e.g. "2025-03-05T06:16:37+05:30"
  if (/T.*[+\-]\d{2}:\d{2}$/.test(ts)) {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  }

  // 3) If it has a 'T' but no offset, assume we need to add +05:30
  //    e.g. "2025-03-05T06:16:37"
  if (/T\d{2}:\d{2}:\d{2}$/.test(ts)) {
    ts += '+05:30';
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  }

  // 4) Otherwise, assume it's "YYYY-MM-DD HH:MM:SS" or similar
  //    e.g. "2025-03-05 06:16:37"
  //    => convert to "2025-03-05T06:16:37+05:30"
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(ts)) {
    ts = ts.replace(' ', 'T') + '+05:30';
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  }

  // If none of the above matched, we cannot parse this format.
  return null;
}

/**
 * Return the current time in IST as a Date object (UTC+5:30).
 */
function getCurrentISTDate() {
  const now = new Date();
  const utcMillis = now.getTime() + now.getTimezoneOffset() * 60000;
  // Add 5.5 hours for IST
  return new Date(utcMillis + 5.5 * 3600000);
}

/**
 * Given a MySQL DATETIME string (stored in IST),
 * return how many seconds, minutes, or hours ago it was.
 */
function timeAgo(mysqlTimestamp) {
  const alertTime = parseISTTimestamp(mysqlTimestamp);
  if (!alertTime) {
    return 'Invalid time';
  }

  const nowIST = getCurrentISTDate();
  const diffInSeconds = Math.floor((nowIST - alertTime) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds} sec ago`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} min ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  return `${diffInHours} hr ago`;
}

const AlertCard = ({ alert, removeAlert }) => {
  // Uncomment for debugging if you're seeing "Invalid time":
  // console.log('Raw time from DB:', alert.time);

  return (
    <div className="alert-card">
      <div className="alert-card-header">
        <span className="alert-card-time">
          {timeAgo(alert.time)}
        </span>
        <span
          className="alert-card-close"
          onClick={() => removeAlert(alert.id)}
        >
          &#x2715;
        </span>
      </div>

      <div className="alert-card-info">
        <h3 className="alert-card-title">
          Bus {alert.busNo} | {alert.source} → {alert.destination}
        </h3>
      </div>

      <div className="alert-card-details">
        <p className="alert-card-message">
          <strong>Message:</strong> {alert.message}
        </p>
        <p className="alert-card-location">
          <strong>Location:</strong> {alert.location}
        </p>
      </div>
    </div>
  );
};

export default AlertCard;
