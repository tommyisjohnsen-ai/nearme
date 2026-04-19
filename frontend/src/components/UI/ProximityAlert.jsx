import './ProximityAlert.css';

export default function ProximityAlert({ name, onChat, onDismiss }) {
  return (
    <div className="proximity-alert">
      <div className="pa-icon">📍</div>
      <div className="pa-body">
        <strong>{name}</strong> er i nærheten av deg!
        <button className="pa-chat-btn" onClick={onChat}>Send melding</button>
      </div>
      <button className="pa-close" onClick={onDismiss} aria-label="Lukk">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>
  );
}
