import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import './MapView.css';

function DotIcon({ name, isOnline }) {
  const initial = name?.charAt(0).toUpperCase() || '?';
  return (
    <div style={{ position: 'relative' }}>
      <div className={`user-dot ${isOnline ? 'online' : 'offline'}`}>
        {initial}
      </div>
      {isOnline && <div className="online-dot" />}
    </div>
  );
}

export default function UserMarker({ user, isOnline, onChat }) {
  if (!user.lat || !user.lng) return null;

  const iconHtml = renderToStaticMarkup(<DotIcon name={user.name} isOnline={isOnline} />);
  const icon = L.divIcon({
    html: iconHtml,
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -24],
  });

  return (
    <Marker position={[user.lat, user.lng]} icon={icon}>
      <Popup className="user-popup">
        <div style={{
          fontFamily: 'var(--font-display)',
          padding: '4px 0',
          minWidth: '140px',
        }}>
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#000', marginBottom: '4px' }}>
            {user.name}
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
            {isOnline ? '🟢 Online nå' : '⚫ Offline'}
          </div>
          <button
            onClick={onChat}
            style={{
              width: '100%',
              padding: '8px 0',
              background: '#00d4ff',
              border: 'none',
              borderRadius: '8px',
              color: '#000',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Send melding
          </button>
        </div>
      </Popup>
    </Marker>
  );
}
