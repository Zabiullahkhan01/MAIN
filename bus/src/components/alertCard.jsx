import React, { useEffect, useRef } from 'react';
import '../css/alertCard.css';

const AlertCard = ({ alert, timeAgo, removeAlert, markAsRead }) => {
  const cardRef = useRef(null);
  // This flag records whether the alert was seen (i.e. reached the visibility threshold).
  const hasBeenSeen = useRef(false);

  useEffect(() => {
    // Skip observation if the alert is already marked as read.
    if (alert.isRead) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // When at least 50% of the card is visible, record that it's been seen.
          hasBeenSeen.current = true;
        } else {
          // When the card leaves the viewport, check if it has been seen.
          // If yes, mark it as read.
          if (hasBeenSeen.current) {
            markAsRead();
            observer.disconnect();
          }
        }
      },
      {
        threshold: 0.5, // Adjust this threshold if needed.
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    // On cleanup, simply disconnect the observer.
    // We do not mark the alert as read on unmount, to prevent marking it during a hard refresh.
    return () => {
      observer.disconnect();
    };
  }, [alert.isRead, markAsRead]);

  return (
    <div ref={cardRef} className={`alert-card ${alert.isRead ? 'read' : 'unread'}`}>
      <div className="alert-card-header">
        <span className="alert-card-time">{timeAgo(alert.time)}</span>
        <span
          className="alert-card-close"
          onClick={(e) => {
            e.stopPropagation();
            removeAlert(alert.id);
          }}
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















