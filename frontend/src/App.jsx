import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import AuthPage from './components/Auth/AuthPage';
import MapView from './components/Map/MapView';
import ChatWindow from './components/Chat/ChatWindow';
import TopBar from './components/UI/TopBar';
import './styles/globals.css';
import './App.css';

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-logo">
        <svg width="48" height="48" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="18" stroke="var(--accent)" strokeWidth="2" />
          <circle cx="20" cy="20" r="6" fill="var(--accent)" />
          <circle cx="20" cy="20" r="12" stroke="var(--accent)" strokeWidth="1" opacity="0.4" />
        </svg>
        <span>NearMe</span>
      </div>
      <div className="loading-spinner" />
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  const [chatPartner, setChatPartner] = useState(null);

  if (loading) return <LoadingScreen />;
  if (!user) return <AuthPage />;

  return (
    <div className="app">
      <TopBar onToggleUsers={() => {}} />
      <div className="app-map">
        <MapView onOpenChat={(partner) => setChatPartner(partner)} />
      </div>
      {chatPartner && (
        <ChatWindow
          partner={chatPartner}
          onClose={() => setChatPartner(null)}
        />
      )}
    </div>
  );
}
