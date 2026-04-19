import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import UserMarker from './UserMarker';
import SelfMarker from './SelfMarker';
import ProximityAlert from '../UI/ProximityAlert';
import './MapView.css';

// Fix Leaflet default icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function FlyToMe({ position }) {
  const map = useMap();
  const didFly = useRef(false);
  useEffect(() => {
    if (position && !didFly.current) {
      map.flyTo(position, 14, { duration: 1.5 });
      didFly.current = true;
    }
  }, [position, map]);
  return null;
}

export default function MapView({ onOpenChat }) {
  const { user, socket, updateUser } = useAuth();
  const [myPosition, setMyPosition] = useState(null);
  const [otherUsers, setOtherUsers] = useState({});
  const [onlineIds, setOnlineIds] = useState(new Set());
  const [isSharing, setIsSharing] = useState(user?.is_sharing_location ?? true);
  const [alerts, setAlerts] = useState([]);
  const watchRef = useRef(null);

  // Load existing user positions on mount
  useEffect(() => {
    api.getUsers().then(({ users }) => {
      const map = {};
      for (const u of users) {
        if (u.lat && u.lng) map[u.id] = u;
      }
      setOtherUsers(map);
    }).catch(console.error);
  }, []);

  // Geolocation tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const pos = [coords.latitude, coords.longitude];
        setMyPosition(pos);
        socket?.emit('location:update', {
          lat: coords.latitude,
          lng: coords.longitude,
          accuracy: coords.accuracy,
        });
      },
      (err) => console.error('[Geo]', err.message),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
  }, [socket]);

  const stopTracking = useCallback(() => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    socket?.emit('location:stop');
  }, [socket]);

  useEffect(() => {
    if (isSharing) {
      startTracking();
    } else {
      stopTracking();
    }
    return () => stopTracking();
  }, [isSharing, startTracking, stopTracking]);

  // Location updates every 15s forced re-emit (handled by watchPosition above)
  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('location:updated', ({ userId, ...data }) => {
      if (userId === user.id) return;
      setOtherUsers((prev) => ({ ...prev, [userId]: { id: userId, ...data } }));
    });

    socket.on('location:stopped', ({ userId }) => {
      setOtherUsers((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    });

    socket.on('users:online', (ids) => {
      setOnlineIds(new Set(ids));
    });

    socket.on('proximity:alert', ({ userId: nearbyId, name }) => {
      const id = Date.now();
      setAlerts((prev) => [...prev, { id, name, userId: nearbyId }]);
      setTimeout(() => setAlerts((prev) => prev.filter((a) => a.id !== id)), 6000);
    });

    return () => {
      socket.off('location:updated');
      socket.off('location:stopped');
      socket.off('users:online');
      socket.off('proximity:alert');
    };
  }, [socket, user.id]);

  const toggleSharing = async () => {
    const next = !isSharing;
    setIsSharing(next);
    updateUser({ is_sharing_location: next });
    await api.setSharing(next).catch(console.error);
    if (next) socket?.emit('location:resume');
  };

  return (
    <div className="map-wrapper">
      <MapContainer
        center={myPosition || [59.9139, 10.7522]}
        zoom={12}
        className="map-container"
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
        />
        <FlyToMe position={myPosition} />

        {myPosition && <SelfMarker position={myPosition} name={user.name} isSharing={isSharing} />}

        {Object.values(otherUsers).map((u) =>
          u.lat && u.lng ? (
            <UserMarker
              key={u.id}
              user={u}
              isOnline={onlineIds.has(u.id)}
              onChat={() => onOpenChat(u)}
            />
          ) : null
        )}
      </MapContainer>

      {/* Sharing toggle */}
      <button
        className={`sharing-toggle ${isSharing ? 'sharing-on' : 'sharing-off'}`}
        onClick={toggleSharing}
        title={isSharing ? 'Skjul posisjon' : 'Del posisjon'}
      >
        {isSharing ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            Del posisjon
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 6.5c2.76 0 5 2.24 5 5 0 .51-.1 1-.24 1.46l3.06 3.06C21.16 14.57 22 12.16 22 9.5 22 4.52 17.52.04 12.04 0 9.31.02 6.84 1.1 5.04 2.9L8.1 5.96C8.93 6.1 10.45 6.5 12 6.5zm-8.74-1.98L1.9 5.88 4 8c-1.25 1.48-2 3.38-2 5.5C2 18.75 6.48 23 12 23c2.12 0 4.02-.75 5.5-2l2.12 2.12 1.41-1.41L3.26 4.52z"/>
            </svg>
            Skjult
          </>
        )}
      </button>

      {/* Proximity alerts */}
      <div className="alerts-container">
        {alerts.map((a) => (
          <ProximityAlert
            key={a.id}
            name={a.name}
            onChat={() => {
              onOpenChat({ id: a.userId, name: a.name });
              setAlerts((prev) => prev.filter((x) => x.id !== a.id));
            }}
            onDismiss={() => setAlerts((prev) => prev.filter((x) => x.id !== a.id))}
          />
        ))}
      </div>
    </div>
  );
}
