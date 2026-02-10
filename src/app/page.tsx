'use client';

import { useState, useRef, useEffect } from 'react';

// Define the shape of a message
interface Message {
  role: 'user' | 'assistant';
  content: string;
  data?: {
    latency?: string;
    model?: string;
    timestamp?: string;
  };
}

// Quick Actions Configuration
const QUICK_ACTIONS = [
  { label: "🤒 Report Fever", query: "My child has a fever of 101. Can I bring them?" },
  { label: "💰 Tuition Rates", query: "How much is tuition?" },
  { label: "📅 Holiday Schedule", query: "Is the center closed for any holidays soon?" },
  { label: "🏫 Schedule Tour", query: "I would like to schedule a tour." }
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hasStarted = messages.length > 0;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(scrollToBottom, [messages]);

  const sendMessage = async (text: string) => {
    if (isLoading) return;
    
    const userMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // API Call
      const payloadMessages = hasStarted 
        ? [...messages, userMessage] 
        : [userMessage];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payloadMessages }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.content,
          data: data.data
        }]);
      } else {
        throw new Error('API Error');
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting. Please call the front desk at 505-767-6500." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
  };

  return (
    <main className="flex flex-col h-screen max-w-2xl mx-auto bg-gray-50 border-x border-gray-200 shadow-xl font-sans relative">
      
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md z-10 shrink-0">
        <div>
          <h1 className="font-bold text-lg tracking-tight">Brightwheel Front Desk</h1>
          <p className="text-xs text-blue-100 opacity-90">Automated Assistant • 24/7</p>
        </div>
        <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse" title="System Online"></div>
      </header>

      {/* VIEW 1: HERO MODE (Centered Start) */}
      {!hasStarted && (
        <div className="flex-1 flex flex-col justify-center items-center p-8 text-center animate-fade-in">
          <div className="bg-blue-100 p-4 rounded-full mb-6">
            <span className="text-4xl">👋</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">How can I help you?</h2>
          <p className="text-gray-500 mb-8 max-w-xs">
            Ask about tuition, health policies, schedules, or report an absence.
          </p>
          
          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md mb-8">
            {QUICK_ACTIONS.map((action, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  sendMessage(action.query);
                }}
                className="bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-700 p-4 rounded-xl text-sm font-medium transition-all text-left shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
              >
                {action.label}
              </button>
            ))}
          </div>

          {/* Main Input (Side-by-Side Button) */}
          <form onSubmit={handleSubmit} className="w-full max-w-md flex gap-2">
            <input
              className="flex-1 p-4 pl-6 border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question here..."
              autoFocus
            />
            <button 
              type="submit"
              disabled={!input.trim()}
              className="bg-blue-600 text-white px-8 rounded-full font-bold shadow-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* VIEW 2: CHAT MODE (Standard Layout) */}
      {hasStarted && (
        <>
          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50 scroll-smooth">
            {messages.map((m, index) => (
              <div key={index} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} animate-slide-up`}>
                <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm 
                  ${m.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                  }`}>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
                {m.data && (
                  <div className="mt-1.5 ml-1 text-[10px] text-gray-400 font-mono flex items-center gap-3">
                    <span className="flex items-center gap-1">⏱ {m.data.latency}</span>
                    <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${m.data.model === 'cache-hit' ? 'bg-green-100 text-green-700 font-bold' : 'bg-gray-100'}`}>
                      {m.data.model === 'cache-hit' ? '⚡ CACHE' : '🤖 AI'}
                    </span>
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-start space-x-2 animate-pulse">
                <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm">
                   <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                   </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Controls */}
          <div className="bg-white border-t border-gray-200">
            {/* Horizontal Scroll Chips */}
            <div className="p-2 overflow-x-auto whitespace-nowrap scrollbar-hide border-b border-gray-100">
               <div className="flex gap-2 px-2">
                {QUICK_ACTIONS.map((action, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      sendMessage(action.query);
                    }}
                    disabled={isLoading}
                    className="bg-gray-50 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors disabled:opacity-50 flex-shrink-0 cursor-pointer"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Input Bar (Side-by-Side Button) */}
            <div className="p-4 pt-2">
              <form onSubmit={handleSubmit} className="flex gap-2 relative">
                <input
                  className="flex-1 p-3 pl-4 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all shadow-sm"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Reply..."
                  disabled={isLoading}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="bg-blue-600 text-white px-6 rounded-full font-bold shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </main>
  );
}