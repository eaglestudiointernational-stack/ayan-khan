
import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import Logo from './components/Logo';
import { ChatMessage as ChatMessageType, ChatSession, AssistantMode, LiveState } from './types';
import { getGeminiResponse, generateImage, getLiveConnection } from './services/geminiService';
import { Menu, Zap, Info, ShieldCheck, Sparkles, Layers, Phone, X, Volume2, Mic } from 'lucide-react';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);
  const [liveState, setLiveState] = useState<LiveState>({ isActive: false, isConnecting: false, transcript: '', audioLevel: 0 });
  const chatEndRef = useRef<HTMLDivElement>(null);
  const liveSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outAudioContextRef = useRef<AudioContext | null>(null);
  const outNextStartTimeRef = useRef<number>(0);

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
    return () => stopLiveSession();
  }, []);

  useEffect(() => {
    localStorage.setItem('omnimind_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, currentSessionId, isLoading]);

  const currentSession = sessions.find(s => s.id === currentSessionId);

  // Live Audio Helpers
  const encodeAudio = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const decodeAudio = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };

  const decodePCM = async (data: Uint8Array, ctx: AudioContext) => {
    const dataInt16 = new Int16Array(data.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
    return buffer;
  };

  const startLiveSession = async () => {
    setLiveState(prev => ({ ...prev, isConnecting: true, isActive: true, transcript: 'Connecting to Live Pulse...' }));
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outNextStartTimeRef.current = 0;

      const sessionPromise = getLiveConnection({
        onopen: () => {
          setLiveState(prev => ({ ...prev, isConnecting: false, transcript: 'OmniMind is listening...' }));
          const source = audioContextRef.current!.createMediaStreamSource(stream);
          const processor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
          processor.onaudioprocess = (e) => {
            const input = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(input.length);
            for (let i = 0; i < input.length; i++) int16[i] = input[i] * 32768;
            sessionPromise.then(s => s.sendRealtimeInput({ media: { data: encodeAudio(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } }));
          };
          source.connect(processor);
          processor.connect(audioContextRef.current!.destination);
        },
        onmessage: async (msg: any) => {
          if (msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
            const data = decodeAudio(msg.serverContent.modelTurn.parts[0].inlineData.data);
            const buffer = await decodePCM(data, outAudioContextRef.current!);
            const source = outAudioContextRef.current!.createBufferSource();
            source.buffer = buffer;
            source.connect(outAudioContextRef.current!.destination);
            outNextStartTimeRef.current = Math.max(outNextStartTimeRef.current, outAudioContextRef.current!.currentTime);
            source.start(outNextStartTimeRef.current);
            outNextStartTimeRef.current += buffer.duration;
          }
          if (msg.serverContent?.inputTranscription) {
            setLiveState(prev => ({ ...prev, transcript: `You: ${msg.serverContent.inputTranscription.text}` }));
          } else if (msg.serverContent?.outputTranscription) {
            setLiveState(prev => ({ ...prev, transcript: `OmniMind: ${msg.serverContent.outputTranscription.text}` }));
          }
        },
        onclose: () => stopLiveSession(),
        onerror: () => stopLiveSession(),
      });
      liveSessionRef.current = await sessionPromise;
    } catch (e) {
      stopLiveSession();
      alert("Microphone access is required for Live Sessions.");
    }
  };

  const stopLiveSession = () => {
    if (liveSessionRef.current) liveSessionRef.current.close();
    if (audioContextRef.current) audioContextRef.current.close();
    if (outAudioContextRef.current) outAudioContextRef.current.close();
    setLiveState({ isActive: false, isConnecting: false, transcript: '', audioLevel: 0 });
    liveSessionRef.current = null;
  };

  const handleSendMessage = async (content: string, mode: AssistantMode, useSearch: boolean, contextImg?: string) => {
    let activeSessionId = currentSessionId || Date.now().toString();
    if (!currentSessionId) {
      const newSession: ChatSession = { id: activeSessionId, title: content.substring(0, 30) + '...', messages: [], lastUpdated: Date.now() };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(activeSessionId);
    }

    const userMsg: ChatMessageType = { id: Date.now().toString(), role: 'user', content, timestamp: Date.now() };
    setSessions(prev => prev.map(s => s.id === activeSessionId ? {
      ...s,
      messages: [...s.messages, userMsg],
      title: s.messages.length === 0 ? content.substring(0, 35) + '...' : s.title,
      lastUpdated: Date.now()
    } : s));

    setIsLoading(true);
    setImageToEdit(null); // Clear context after use

    try {
      if (mode === AssistantMode.Artistic || contextImg) {
        const imageUrl = await generateImage(content, contextImg);
        const assistantMsg: ChatMessageType = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: contextImg ? `Remix complete! I've updated the image according to your feedback.` : `I've created this image based on your prompt: "${content}"`,
          timestamp: Date.now(),
          type: 'image',
          imageUrl
        };
        setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, assistantMsg] } : s));
      } else {
        const history = (sessions.find(s => s.id === activeSessionId)?.messages || []).map(m => ({ role: m.role, content: m.content }));
        const systemInstruction = `You are OmniMind, an advanced AI Assistant by Muhammad Ayan. Mode: ${mode}.`;
        const response = await getGeminiResponse(content, history, systemInstruction, useSearch);
        const assistantMsg: ChatMessageType = { id: (Date.now() + 1).toString(), role: 'assistant', content: response.text, timestamp: Date.now(), sources: response.sources };
        setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, assistantMsg] } : s));
      }
    } catch (err: any) {
      const content = err.message === "QUOTA_EXHAUSTED" ? "⚠️ API Limit reached." : `Error: ${err.message}`;
      setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, { id: Date.now().toString(), role: 'assistant', content, timestamp: Date.now(), isError: true }] } : s));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <Sidebar sessions={sessions} currentSessionId={currentSessionId} onNewChat={() => { stopLiveSession(); setCurrentSessionId(null); }} onSelectSession={setCurrentSessionId} onDeleteSession={id => setSessions(prev => prev.filter(s => s.id !== id))} isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />

      <main className="flex-1 flex flex-col min-w-0 h-full relative bg-[#fcfdff]">
        <header className="h-16 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl flex items-center justify-between px-6 z-20 sticky top-0 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"><Menu size={22} /></button>
            <div className="flex flex-col">
              <h1 className="text-sm font-black text-slate-900 truncate max-w-[200px] tracking-tight">{currentSession?.title || 'OMNIMIND AI'}</h1>
              <div className="flex items-center text-[9px] text-indigo-600 font-black uppercase tracking-[0.2em]">
                <Sparkles size={10} className="mr-1.5 fill-indigo-600 animate-pulse" /> Gemini 2.5 Live Enabled
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             <button 
                onClick={liveState.isActive ? stopLiveSession : startLiveSession}
                className={`flex items-center px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  liveState.isActive ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100'
                }`}
             >
               {liveState.isActive ? <X size={14} className="mr-2" /> : <Phone size={14} className="mr-2" />}
               <span>{liveState.isActive ? 'End Live' : 'Live Pulse'}</span>
             </button>
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 shadow-lg flex items-center justify-center text-white text-[10px] font-black">MA</div>
          </div>
        </header>

        {liveState.isActive && (
          <div className="absolute inset-x-0 top-16 bottom-0 bg-[#0a0c14]/95 backdrop-blur-2xl z-50 flex flex-col items-center justify-center text-white p-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="relative mb-12">
               <div className="w-32 h-32 rounded-full border-4 border-indigo-500 flex items-center justify-center animate-pulse shadow-[0_0_50px_rgba(79,70,229,0.3)]">
                  <Volume2 size={48} className="text-indigo-400" />
               </div>
               <div className="absolute -inset-4 rounded-full border border-indigo-500/20 animate-ping" />
            </div>
            <h2 className="text-2xl font-black mb-2 tracking-tight">OMNIMIND LIVE</h2>
            <div className="max-w-md text-center">
              <p className="text-indigo-300 font-bold text-sm h-12 overflow-y-auto mb-8 transition-all">{liveState.transcript}</p>
              <div className="flex justify-center space-x-1 mb-8">
                 {[1,2,3,4,5,6].map(i => (
                   <div key={i} className="w-1.5 bg-indigo-500 rounded-full animate-voice-bar" style={{ height: '12px', animationDelay: `${i*0.1}s` }} />
                 ))}
              </div>
              <button onClick={stopLiveSession} className="bg-red-500 hover:bg-red-600 px-8 py-4 rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-red-950/40 active:scale-95 transition-all flex items-center space-x-3 mx-auto">
                 <X size={18} />
                 <span>Disconnect Pulse</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pt-8 pb-4 scroll-smooth">
          <div className="max-w-4xl mx-auto px-4 pb-16">
            {(!currentSession || currentSession.messages.length === 0) ? (
              <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-10 animate-in fade-in zoom-in-95 duration-1000">
                <Logo className="w-32 h-32" />
                <div className="space-y-4">
                  <h2 className="text-5xl font-black text-slate-900 tracking-tighter">OmniMind Pulse</h2>
                  <p className="text-slate-400 max-w-lg mx-auto text-lg font-medium leading-relaxed">Multimodal intelligence with Real-time Voice and Vision capabilities.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {currentSession.messages.map((msg) => <ChatMessage key={msg.id} message={msg} onEditImage={setImageToEdit} />)}
              </div>
            )}
            <div ref={chatEndRef} className="h-8" />
          </div>
        </div>

        <div className="bg-gradient-to-t from-[#fcfdff] via-[#fcfdff] to-transparent pt-12 pb-4 z-10 sticky bottom-0">
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} imageContext={imageToEdit} onClearImageContext={() => setImageToEdit(null)} />
        </div>
      </main>
    </div>
  );
};

export default App;
