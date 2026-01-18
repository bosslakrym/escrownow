
import React, { useState, useEffect, useRef } from 'react';
import { Message, User } from '../types';

interface Props {
  messages: Message[];
  currentUser: User;
  onSendMessage: (text: string) => void;
}

export const Chat: React.FC<Props> = ({ messages, currentUser, onSendMessage }) => {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  return (
    <div className="flex flex-col h-[400px] border border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
      <div className="bg-white border-b border-slate-200 p-3 flex items-center justify-between">
        <h4 className="font-medium text-slate-700 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          Transaction Chat
        </h4>
        <span className="text-[10px] text-slate-400 uppercase tracking-widest">End-to-End Secure</span>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-slate-400 italic">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id}
              className={`flex ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                msg.senderId === currentUser.id 
                  ? 'bg-green-600 text-white rounded-br-none' 
                  : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
              }`}>
                {msg.text}
                <div className={`text-[10px] mt-1 opacity-70 ${msg.senderId === currentUser.id ? 'text-white' : 'text-slate-400'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-slate-200 flex gap-2">
        <input 
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-slate-100 border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
        />
        <button 
          type="submit"
          className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
    </div>
  );
};
