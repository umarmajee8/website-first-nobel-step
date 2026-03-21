
import React, { useState, useRef, useEffect } from 'react';
import { getAIResponse } from '../services/gemini.ts';

const AIChatAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string, time: string}[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fms_chat_history');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Failed to parse chat history", e);
        }
      }
    }
    return [{ 
      role: 'ai', 
      text: 'Salam! 👋 Welcome to First Nobel Step. I am your dedicated support assistant. How can I help you with our Official Membership Programs today?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }];
  });
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('fms_chat_history', JSON.stringify(messages));
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      sessionStorage.setItem('fms_chat_opened', 'true');
      setTimeout(() => {
        inputRef.current?.focus();
        scrollToBottom();
      }, 300);
      
      if (window.innerWidth < 640) {
        document.body.style.overflow = 'hidden';
      }
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg = input.trim();
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    setMessages(prev => [...prev, { role: 'user', text: userMsg, time }]);
    setInput('');
    setIsLoading(true);

    setTimeout(scrollToBottom, 100);

    try {
      const aiMsg = await getAIResponse(userMsg);
      const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages(prev => [...prev, { role: 'ai', text: aiMsg || 'I am currently busy. Please try again later.', time: aiTime }]);
    } catch (err) {
      console.error("Chat Error:", err);
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I encountered an error.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatMessage = (text: string) => {
    return text.split(/(\*\*.*?\*\*)/g).map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const ChatAvatar = () => (
    <div className="w-full h-full bg-white flex items-center justify-center p-1.5">
        <svg viewBox="15 20 70 100" className="w-full h-full">
            <g fill="#01411C">
                <path d="M31,21.5 h27 v14.5 c0,0 -12.5,1.5 -12.8,24.5 c-0.2,15.5 -10.5,31.5 -17.5,36.5 c-7,5 -16,1 -16,-5.5 c0-5.5,5-8,9.5-11 c4-2.5,10-11,10-23.5 c0-13.5,0.3-22.5,0.3-22.5 z" />
                <path d="M53.5,58.5 c0,0,3.8,12,3.8,24 c0,10.5,0,17.5,10.5,20.5 c9.5,3,17-2.5,17-8 c0-3-3.5-6-8.5-7.5 c-4.5-1.5-9.5-6-11.5-13 c-2-7-4.5-16-4.5-16 z" />
            </g>
        </svg>
    </div>
  );

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-[80] w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-500 hover:scale-105 active:scale-95 group ${
          isOpen ? 'bg-gray-800 rotate-90' : 'bg-[#25D366]'
        }`}
      >
        {isOpen ? (
          <i className="fa-solid fa-times text-white text-2xl"></i>
        ) : (
          <div className="relative flex items-center justify-center w-full h-full">
            <i className="fa-brands fa-whatsapp text-white text-4xl"></i>
            <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold border-2 border-white animate-pulse">1</span>
          </div>
        )}
      </button>

      <div className={`fixed inset-0 z-[70] transition-all duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/20" onClick={() => setIsOpen(false)}></div>
        <div className={`absolute sm:bottom-24 sm:right-6 w-full h-full sm:w-[400px] sm:h-[650px] sm:max-h-[80vh] bg-[#EFE7DD] dark:bg-[#0b141a] sm:rounded-[24px] shadow-2xl flex flex-col overflow-hidden transition-all duration-300 transform border-0 sm:border border-gray-200 dark:border-gray-800 ${isOpen ? 'translate-y-0 scale-100' : 'translate-y-10 scale-95 opacity-0'}`}>
          <div className="bg-[#008069] dark:bg-[#202C33] px-4 py-3 flex items-center justify-between shadow-sm flex-shrink-0 z-10">
             <div className="flex items-center gap-3">
               <button onClick={() => setIsOpen(false)} className="sm:hidden text-white mr-1"><i className="fa-solid fa-arrow-left text-xl"></i></button>
               <div className="relative">
                 <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden"><ChatAvatar /></div>
                 <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#25D366] border-2 border-[#008069] rounded-full"></span>
               </div>
               <div className="flex flex-col text-white">
                 <div className="flex items-center gap-1"><span className="font-bold text-base leading-none">First Nobel Step</span><i className="fa-solid fa-certificate text-xs text-[#25D366] bg-white rounded-full p-[1px]"></i></div>
                 <span className="text-xs text-green-100 opacity-90 leading-tight mt-0.5">{isLoading ? 'typing...' : 'Online'}</span>
               </div>
             </div>
             <div className="flex items-center gap-4 text-white"><i className="fa-solid fa-video"></i><i className="fa-solid fa-phone"></i><i className="fa-solid fa-ellipsis-vertical"></i></div>
          </div>
          <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-4 sm:p-5 space-y-3 relative bg-[#EFE7DD] dark:bg-[#0b141a]">
            <div className="absolute inset-0 opacity-[0.08] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", backgroundSize: '400px' }}></div>
            <div className="flex justify-center my-4 relative z-10 px-6"><div className="bg-[#FFEECD] dark:bg-[#182229] text-[#54656F] dark:text-[#FFD279] text-[10px] px-3 py-2 rounded-lg text-center shadow-sm border border-[#FFEECD] dark:border-[#182229]"><i className="fa-solid fa-lock text-[10px] mr-1.5"></i> End-to-end encrypted messaging.</div></div>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} relative z-10 mb-1`}>
                <div className={`relative max-w-[85%] px-3 py-1.5 text-sm rounded-lg shadow-sm ${m.role === 'user' ? 'bg-[#E7FFDB] dark:bg-[#005C4B] text-[#111B21] dark:text-[#E9EDEF] rounded-tr-none' : 'bg-white dark:bg-[#202C33] text-[#111B21] dark:text-[#E9EDEF] rounded-tl-none'}`}>
                  <div className="whitespace-pre-wrap">{formatMessage(m.text)}</div>
                  <div className="flex items-center justify-end gap-1 mt-1"><span className="text-[10px] opacity-50">{m.time}</span>{m.role === 'user' && <i className="fa-solid fa-check-double text-[10px] text-[#53BDEB]"></i>}</div>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="bg-[#F0F2F5] dark:bg-[#202C33] px-2 py-2 flex items-end gap-2 z-10">
            <button className="p-3 text-[#54656F] dark:text-[#8696A0] hidden sm:block"><i className="fa-regular fa-face-smile text-2xl"></i></button>
            <div className="flex-grow bg-white dark:bg-[#2A3942] rounded-2xl px-4 py-2 min-h-[44px] flex items-center"><input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Type a message" className="w-full bg-transparent text-[#111B21] dark:text-[#E9EDEF] text-[15px] focus:outline-none" autoComplete="off" /></div>
            <button onClick={handleSend} className="w-11 h-11 rounded-full flex items-center justify-center text-white bg-[#008069]">{input.trim() ? <i className="fa-solid fa-paper-plane"></i> : <i className="fa-solid fa-microphone"></i>}</button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AIChatAssistant;
