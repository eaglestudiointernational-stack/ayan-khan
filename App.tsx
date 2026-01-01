
import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import { ChatMessage as ChatMessageType, ChatSession, AssistantMode } from './types';
import { getGeminiResponse } from './services/geminiService';
import { Menu, Zap, Info } from 'lucide-react';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('omnimind_sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed);
        if (parsed.length > 0) setCurrentSessionId(parsed[0].id);
      } catch (e) {
        console.error("Failed to load sessions", e);
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('omnimind_sessions', JSON.stringify(sessions));
  }, [sessions]);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, currentSessionId]);

  const currentSession = sessions.find(s => s.id === currentSessionId);

  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [],
      lastUpdated: Date.now()
    };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newSession.id);
    setIsSidebarOpen(false);
  };

  const handleSendMessage = async (content: string, mode: AssistantMode) => {
    let activeSessionId = currentSessionId;
    
    // Create new session if none exists
    if (!activeSessionId) {
      const newId = Date.now().toString();
      const newSession: ChatSession = {
        id: newId,
        title: content.substring(0, 30) + (content.length > 30 ? '...' : ''),
        messages: [],
        lastUpdated: Date.now()
      };
      setSessions([newSession, ...sessions]);
      activeSessionId = newId;
      setCurrentSessionId(newId);
    }

    const userMsg: ChatMessageType = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    // Update session title on first message
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          messages: [...s.messages, userMsg],
          title: s.messages.length === 0 ? (content.substring(0, 35) + '...') : s.title,
          lastUpdated: Date.now()
        };
      }
      return s;
    }));

    setIsLoading(true);

    try {
      const history = (currentSession?.messages || []).map(m => ({
        role: m.role,
        content: m.content
      }));

      const systemInstruction = `
        You are OmniMind, an advanced AI Assistant powered by Gemini 3.
        Your goal is to be helpful, professional, and clear.
        Current Mode: ${mode}

        Specific guidelines for ${mode}:
        - Creative Writing: Focus on vivid imagery, engaging dialogue, and publishable quality.
        - Technical Support: Provide step-by-step, error-free instructions with code blocks where relevant.
        - Educational Help: Explain concepts clearly, use analogies, and provide quizzes or summaries if requested.
        - Productivity: Draft emails, reports, and plans with professional formatting.
        - Urdu & Culture: Respond in high-quality Urdu (using Noto Sans Arabic) where appropriate. Respect cultural nuances and provide moral/historical context.
        - General: Be concise yet comprehensive.

        Always use:
        - Markdown for structure (headings, lists).
        - LaTeX for math: Use $...$ for inline and $$...$$ for block math.
        - Tables for comparisons.
        - Accurate, up-to-date facts (Search grounding is enabled).
      `;

      const response = await getGeminiResponse(content, history, systemInstruction);

      const assistantMsg: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text,
        timestamp: Date.now(),
        sources: response.sources
      };

      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            messages: [...s.messages, assistantMsg],
            lastUpdated: Date.now()
          };
        }
        return s;
      }));
    } catch (err: any) {
      const errorMsg: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${err.message || 'Unknown error'}. Please check your API key and network connection.`,
        timestamp: Date.now(),
        isError: true
      };

      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            messages: [...s.messages, errorMsg],
            lastUpdated: Date.now()
          };
        }
        return s;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSession = (id: string) => {
    setCurrentSessionId(id);
    setIsSidebarOpen(false);
  };

  const handleDeleteSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) setCurrentSessionId(null);
  };

  return (
    <div className="flex h-screen bg-[#f8fafc]">
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 z-10 sticky top-0">
          <div className="flex items-center">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-lg mr-2"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-sm font-bold text-slate-900 truncate max-w-[200px] md:max-w-md">
                {currentSession?.title || 'OmniMind AI'}
              </h1>
              <div className="flex items-center text-[10px] text-indigo-600 font-medium uppercase tracking-wide">
                <Zap size={10} className="mr-1 fill-indigo-600" />
                Gemini 3 Pro Active
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="hidden sm:flex px-2 py-1 bg-green-50 text-green-700 text-[10px] font-bold rounded-full border border-green-100 items-center">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse" />
              SYSTEM ONLINE
            </div>
            <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors">
              <Info size={18} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto no-scrollbar pt-8 pb-4">
          <div className="max-w-4xl mx-auto px-4">
            {(!currentSession || currentSession.messages.length === 0) ? (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6">
                <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-2xl shadow-indigo-200 rotate-3">
                  O
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">How can I help you today?</h2>
                  <p className="text-slate-500 max-w-md mx-auto">
                    Your personal expert for creative writing, code debugging, research, and cultural translation.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl mt-8">
                  {[
                    { title: "Technical Support", text: "Explain quantum computing simply", icon: "💻" },
                    { title: "Creative Writing", text: "Write a poem about a rainy night in Lahore", icon: "✍️" },
                    { title: "Productivity", text: "Draft a formal apology email to a client", icon: "📈" },
                    { title: "Urdu Culture", text: "اردو میں علامہ اقبال کی شاعری پر تبصرہ کریں", icon: "🕌" }
                  ].map((card, i) => (
                    <button 
                      key={i}
                      onClick={() => handleSendMessage(card.text, AssistantMode.General)}
                      className="p-4 bg-white border border-slate-200 rounded-2xl text-left hover:border-indigo-400 hover:shadow-lg transition-all group"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{card.icon}</span>
                        <div>
                           <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{card.title}</div>
                           <div className="text-sm font-medium text-slate-700 group-hover:text-indigo-600 truncate">{card.text}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              currentSession.messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))
            )}
            {isLoading && (
              <div className="flex justify-start mb-6">
                <div className="flex items-center space-x-2 bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" />
                  </div>
                  <span className="text-xs font-medium text-slate-400">OmniMind is thinking...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </main>
    </div>
  );
};

export default App;
