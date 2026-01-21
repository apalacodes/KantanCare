import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { chatWithAI } from '../services/api';

const AIChat = ({ user }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your AI health assistant. I can help you with health questions, symptom analysis, and general medical information. How can I assist you today?",
      sender: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatWithAI(input);
      const aiMessage = {
        id: Date.now() + 1,
        text: response.message || response.response || 'I apologize, but I couldn\'t process your request right now. Please try again later.',
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Sorry, I\'m having trouble connecting to the AI service right now. Please try again later or consult with a healthcare professional for urgent matters.',
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 1,
        text: "Hello! I'm your AI health assistant. I can help you with health questions, symptom analysis, and general medical information. How can I assist you today?",
        sender: 'assistant',
        timestamp: new Date()
      }
    ]);
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>
          <div className="logo">KC</div>
          AI Health Assistant
        </h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={clearChat}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#718096'
            }}
          >
            Clear Chat
          </button>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-content" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)' }}>
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', marginBottom: 0 }}>
          <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '20px', 
            background: 'linear-gradient(180deg, #fff, #f7fafc)',
            marginBottom: '20px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  marginBottom: '20px',
                  textAlign: message.sender === 'user' ? 'right' : 'left'
                }}
              >
                <div
                  style={{
                    display: 'inline-block',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    maxWidth: '80%',
                    background: message.sender === 'user' 
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : '#f1f5f9',
                    color: message.sender === 'user' ? '#fff' : '#1a202c',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    borderBottomRightRadius: message.sender === 'user' ? '4px' : '12px',
                    borderBottomLeftRadius: message.sender === 'user' ? '12px' : '4px'
                  }}
                >
                  <div 
                    dangerouslySetInnerHTML={{
                      __html: message.text.replace(/\n/g, '<br>')
                    }}
                  />
                  <div style={{ 
                    fontSize: '12px', 
                    opacity: 0.7, 
                    marginTop: '8px',
                    textAlign: message.sender === 'user' ? 'right' : 'left'
                  }}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div style={{ textAlign: 'left', marginBottom: '20px' }}>
                <div
                  style={{
                    display: 'inline-block',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: '#f1f5f9',
                    color: '#1a202c',
                    borderBottomLeftRadius: '4px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                    AI is thinking...
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            padding: '16px',
            background: '#fff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
              {/* Age removed — no longer collected */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about symptoms, health questions, or request medical advice..."
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              style={{
                padding: '12px 20px',
                background: isLoading || !input.trim() 
                  ? '#e2e8f0' 
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: isLoading || !input.trim() ? '#a0aec0' : '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                minWidth: '80px'
              }}
            >
              {isLoading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>

        <div style={{ 
          background: '#fff3cd', 
          color: '#856404', 
          padding: '12px 16px', 
          borderRadius: '8px',
          fontSize: '14px',
          textAlign: 'center',
          marginTop: '16px'
        }}>
          ⚠️ This AI assistant provides general health information only. For medical emergencies, contact emergency services immediately.
        </div>
      </main>
    </div>
  );
};

export default AIChat;