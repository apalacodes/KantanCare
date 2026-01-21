import React, { useState, useRef, useEffect } from 'react';
import { chatWithAI } from '../services/api';

const AIWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      text: "Hello! I'm your AI health assistant. Describe your symptoms or ask me health-related questions.",
      sender: 'assistant'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatWithAI(input);
      const aiMessage = { 
        text: response.message || response.response || 'I apologize, but I couldn\'t process your request right now.', 
        sender: 'assistant' 
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI chat error:', error);
      const errorMessage = { 
        text: 'Sorry, I\'m having trouble connecting right now. Please try again later.', 
        sender: 'assistant' 
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

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="ai-widget-btn"
        style={{
          position: 'fixed',
          right: '18px',
          bottom: '18px',
          background: 'linear-gradient(90deg, #667eea, #764ba2)',
          color: '#fff',
          padding: '12px 14px',
          borderRadius: '50px',
          boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
          zIndex: 9999,
          cursor: 'pointer',
          fontWeight: 700,
          border: 'none',
          fontSize: '14px'
        }}
      >
        AI
      </button>
    );
  }

  return (
    <div
      className="ai-panel"
      style={{
        position: 'fixed',
        right: '18px',
        bottom: '78px',
        width: '360px',
        height: '520px',
        maxHeight: '80vh',
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 24px 48px rgba(2, 6, 23, 0.2)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <div
        className="ai-header"
        style={{
          background: 'linear-gradient(90deg, #667eea, #764ba2)',
          color: '#fff',
          padding: '10px 12px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        AI Assistant
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      </div>

      <div
        className="ai-body"
        style={{
          padding: '12px',
          overflowY: 'auto',
          flex: 1,
          background: 'linear-gradient(180deg, #fff, #f7fafc)',
          scrollBehavior: 'smooth'
        }}
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className={`ai-msg ${message.sender}`}
            style={{
              marginBottom: '10px',
              textAlign: message.sender === 'user' ? 'right' : 'left'
            }}
          >
            <div
              className={`ai-bubble ${message.sender}`}
              style={{
                display: 'inline-block',
                padding: '8px 12px',
                borderRadius: '10px',
                maxWidth: '78%',
                boxShadow: '0 6px 18px rgba(2, 6, 23, 0.06)',
                background: message.sender === 'user' 
                  ? '#667eea' 
                  : '#f1f5f9',
                color: message.sender === 'user' 
                  ? '#fff' 
                  : '#0f172a',
                borderBottomRightRadius: message.sender === 'user' ? '4px' : '10px',
                borderBottomLeftRadius: message.sender === 'user' ? '10px' : '4px'
              }}
              dangerouslySetInnerHTML={{
                __html: message.text.replace(/\n/g, '<br>')
              }}
            />
          </div>
        ))}
        {isLoading && (
          <div className="ai-msg assistant" style={{ textAlign: 'left' }}>
            <div
              className="ai-bubble assistant"
              style={{
                display: 'inline-block',
                padding: '8px 12px',
                borderRadius: '10px',
                maxWidth: '78%',
                background: '#f1f5f9',
                color: '#0f172a',
                borderBottomLeftRadius: '4px'
              }}
            >
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div
        className="ai-footer"
        style={{
          display: 'flex',
          gap: '8px',
          padding: '10px',
          background: '#fff',
          borderTop: '1px solid #eef2f6'
        }}
      >
        {/* Age removed — not collected */}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Describe symptoms or ask a question..."
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '8px 10px',
            border: '1px solid #e6edf3',
            borderRadius: '8px'
          }}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          style={{
            background: 'linear-gradient(90deg, #667eea, #764ba2)',
            color: '#fff',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '8px',
            cursor: 'pointer',
            opacity: isLoading || !input.trim() ? 0.6 : 1
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default AIWidget;