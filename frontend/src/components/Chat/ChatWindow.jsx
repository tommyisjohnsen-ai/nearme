import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import './ChatWindow.css';

export default function ChatWindow({ partner, onClose }) {
  const { user, socket } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);

  // Load message history
  useEffect(() => {
    setLoading(true);
    api.getMessages(partner.id)
      .then(({ messages }) => setMessages(messages))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [partner.id]);

  // Join chat room
  useEffect(() => {
    socket?.emit('chat:join', { partnerId: partner.id });
    return () => socket?.emit('chat:leave', { partnerId: partner.id });
  }, [socket, partner.id]);

  // Incoming messages + typing
  const handleMessage = useCallback((msg) => {
    const isRelevant =
      (msg.sender_id === partner.id && msg.receiver_id === user.id) ||
      (msg.sender_id === user.id && msg.receiver_id === partner.id);
    if (!isRelevant) return;
    setMessages((prev) => {
      const exists = prev.some((m) => m.id === msg.id);
      return exists ? prev : [...prev, msg];
    });
  }, [partner.id, user.id]);

  useEffect(() => {
    if (!socket) return;
    socket.on('message:received', handleMessage);
    socket.on('chat:typing', ({ userId, isTyping: t }) => {
      if (userId === partner.id) setIsTyping(t);
    });
    return () => {
      socket.off('message:received', handleMessage);
      socket.off('chat:typing');
    };
  }, [socket, handleMessage, partner.id]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !socket) return;
    socket.emit('message:send', { receiverId: partner.id, content: text });
    setInput('');
    clearTyping();
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    socket?.emit('chat:typing', { partnerId: partner.id, isTyping: true });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      clearTyping();
    }, 2000);
  };

  const clearTyping = () => {
    socket?.emit('chat:typing', { partnerId: partner.id, isTyping: false });
    clearTimeout(typingTimeout.current);
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
  };

  const initial = partner.name?.charAt(0).toUpperCase();

  return (
    <div className="chat-window">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="chat-avatar">{initial}</div>
          <div>
            <div className="chat-partner-name">{partner.name}</div>
            <div className="chat-status">{isTyping ? 'Skriver…' : 'Aktiv'}</div>
          </div>
        </div>
        <button className="chat-close" onClick={onClose} aria-label="Lukk chat">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {loading && (
          <div className="chat-loading">
            <div className="spinner-sm" />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="chat-empty">
            <div className="chat-empty-icon">💬</div>
            <p>Start samtalen med {partner.name}</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === user.id;
          return (
            <div key={msg.id} className={`msg-row ${isMine ? 'mine' : 'theirs'}`}>
              {!isMine && <div className="msg-avatar-sm">{initial}</div>}
              <div className={`msg-bubble ${isMine ? 'mine' : 'theirs'}`}>
                <span className="msg-text">{msg.content}</span>
                <span className="msg-time">{formatTime(msg.created_at)}</span>
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div className="msg-row theirs">
            <div className="msg-avatar-sm">{initial}</div>
            <div className="typing-indicator">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form className="chat-input-bar" onSubmit={sendMessage}>
        <input
          type="text"
          className="chat-input"
          placeholder={`Melding til ${partner.name}…`}
          value={input}
          onChange={handleInputChange}
          autoFocus
          maxLength={2000}
        />
        <button type="submit" className="chat-send" disabled={!input.trim()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </form>
    </div>
  );
}
