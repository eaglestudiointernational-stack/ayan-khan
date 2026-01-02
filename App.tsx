
import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import Logo from './components/Logo';
import { ChatMessage as ChatMessageType, ChatSession, AssistantMode } from './types';
import { getGeminiResponse, generateImage } from './services/geminiService';
import { Menu, Zap, Info, ShieldCheck, Sparkles, Layers } from 'lucide-react';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('omnimind_sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSessions(parsed);
          if (parsed.length > 0) setCurrentSessionId(parsed[0].id);
        }
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('omnimind_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, currentSessionId, isLoading]);

  const currentSession = sessions.find(s => s.id === currentSessionId);

  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Discussion',
      messages: [],
      lastUpdated: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setIsSidebarOpen(false);
  };

  const handleSendMessage = async (content: string, mode: AssistantMode, useSearch: boolean) => {
    let activeSessionId = currentSessionId || Date.now().toString();
    
    if (!currentSessionId) {
      const newSession: ChatSession = {
        id: activeSessionId,
        title: content.substring(0, 30) + '...',
        messages: [],
        lastUpdated: Date.now()
      };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(activeSessionId);
    }

    const userMsg: ChatMessageType = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    setSessions(prev => prev.map(s => s.id === activeSessionId ? {
      ...s,
      messages: [...s.messages, userMsg],
      title: s.messages.length === 0 ? content.substring(0, 35) + '...' : s.title,
      lastUpdated: Date.now()
    } : s));

    setIsLoading(true);

    try {
      if (mode === AssistantMode.Artistic) {
        const imageUrl = await generateImage(content);
        const assistantMsg: ChatMessageType = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I've created this image based on your prompt: "${content}"`,
          timestamp: Date.now(),
          type: 'image',
          imageUrl
        };
        setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, assistantMsg] } : s));
      } else {
        const history = (sessions.find(s => s.id === activeSessionId)?.messages || []).map(m => ({
          role: m.role,
          content: m.content
        }));

        const systemInstruction = `You are OmniMind, an advanced AI Assistant by Muhammad Ayan. Mode: ${mode}.`;
        const response = await getGeminiResponse(content, history, systemInstruction, useSearch);

        const assistantMsg: ChatMessageType = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.text,
          timestamp: Date.now(),
          sources: response.sources
        };
        setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, assistantMsg] } : s));
      }
    } catch (err: any) {
      const content = err.message === "QUOTA_EXHAUSTED" 
        ? "⚠️ API Limit reached. Please wait a minute." 
        : `Error: ${err.message}`;
      
      const errorMsg: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content,
        timestamp: Date.now(),
        isError: true
      };
      setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, errorMsg] } : s));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSession = (id: string) => { setCurrentSessionId(id); setIsSidebarOpen(false); };
  const handleDeleteSession = (id: string) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (currentSessionId === id) setCurrentSessionId(filtered.length > 0 ? filtered[0].id : null);
      return filtered;
    });
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <main className="flex-1 flex flex-col min-w-0 h-full relative bg-[#fcfdff]">
        <header className="h-16 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl flex items-center justify-between px-6 z-20 sticky top-0 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
              <Menu size={22} />
            </button>
            <div className="flex flex-col">
              <h1 className="text-sm font-black text-slate-900 truncate max-w-[200px] tracking-tight">
                {currentSession?.title || 'OMNIMIND AI'}
              </h1>
              <div className="flex items-center text-[9px] text-indigo-600 font-black uppercase tracking-[0.2em]">
                <Sparkles size={10} className="mr-1.5 fill-indigo-600 animate-pulse" />
                Gemini 3 Multi-Engine
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="hidden lg:flex items-center px-3 py-1.5 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
               <Layers size={14} className="text-indigo-600 mr-2" />
               <span className="text-[10px] font-bold text-indigo-700 tracking-wider">PREMIUM ACCESS</span>
             </div>
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 shadow-lg shadow-indigo-100 flex items-center justify-center text-white text-[10px] font-black">
                MA
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto pt-8 pb-4 scroll-smooth">
          <div className="max-w-4xl mx-auto px-4 pb-16">
            {(!currentSession || currentSession.messages.length === 0) ? (
              <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-10 animate-in fade-in zoom-in-95 duration-1000">
                <Logo className="w-32 h-32" />
                <div className="space-y-4">
                  <h2 className="text-5xl font-black text-slate-900 tracking-tighter">Welcome to OmniMind</h2>
                  <p className="text-slate-400 max-w-lg mx-auto text-lg font-medium leading-relaxed">
                    The next generation of AI is here. Experience high-fidelity creative art, real-time research, and human-like understanding.
                  </p>
                </div>
                
                <div className="flex flex-wrap justify-center gap-3 max-w-3xl">
                   {["Generate a Cyberpunk City", "Top 10 Trends in AI 2025", "اردو شاعری کی تاریخ", "Fix my React performance"].map((p, i) => (
                     <button key={i} onClick={() => handleSendMessage(p, AssistantMode.General, true)} className="px-5 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:shadow-xl hover:-translate-y-0.5 transition-all shadow-sm">
                       {p}
                     </button>
                   ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {currentSession.messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)}
              </div>
            )}
            
            {isLoading && (
              <div className="flex justify-start mb-6 animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="flex items-center space-x-4 bg-white/50 backdrop-blur border border-slate-100 rounded-2xl px-6 py-4 shadow-sm">
                  <div className="flex space-x-1.5">
                    <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-2.5 h-2.5 bg-violet-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce" />
                  </div>
                  <span className="text-[10px] font-black text-indigo-600 tracking-[0.2em] uppercase">Processing Query</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} className="h-8" />
          </div>
        </div>

        <div className="bg-gradient-to-t from-[#fcfdff] via-[#fcfdff] to-transparent pt-12 pb-4 z-10 sticky bottom-0">
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
      </main>
    </div>
  );
};

export default App;
