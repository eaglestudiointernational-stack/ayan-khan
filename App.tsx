
import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import Logo from './components/Logo';
import { ChatMessage as ChatMessageType, ChatSession, AssistantMode, LiveState, GroundingNode, ImageSize } from './types';
import { getGeminiResponse, generateImage, getLiveConnection } from './services/geminiService';
import { Menu, Sparkles, Phone, X, Volume2, Mic, Activity } from 'lucide-react';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);
  const [liveState, setLiveState] = useState<LiveState>({ 
    isActive: false, 
    isConnecting: false, 
    transcript: '', 
    audioLevel: 0,
    vibe: 'calm'
  });
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const liveSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outAudioContextRef = useRef<AudioContext | null>(null);
  const outNextStartTimeRef = useRef<number>(0);
  const analyzerRef = useRef<AnalyserNode | null>(null);

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

  // Vibe tracking logic
  useEffect(() => {
    if (!liveState.isActive) return;
    const interval = setInterval(() => {
      if (analyzerRef.current) {
        const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
        analyzerRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        
        let newVibe: LiveState['vibe'] = 'calm';
        if (average > 60) newVibe = 'intense';
        else if (average > 30) newVibe = 'energetic';
        else if (average < 5) newVibe = 'silent';
        
        setLiveState(prev => ({ ...prev, vibe: newVibe, audioLevel: average }));
      }
    }, 100);
    return () => clearInterval(interval);
  }, [liveState.isActive]);

  const startLiveSession = async () => {
    setLiveState(prev => ({ ...prev, isConnecting: true, isActive: true, transcript: 'Connecting to Pulse Network...' }));
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      analyzerRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyzerRef.current);

      const sessionPromise = getLiveConnection({
        onopen: () => {
          setLiveState(prev => ({ ...prev, isConnecting: false, transcript: 'OmniMind Live is now active.' }));
          const processor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
          processor.onaudioprocess = (e) => {
            const input = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(input.length);
            for (let i = 0; i < input.length; i++) int16[i] = input[i] * 32768;
            sessionPromise.then(s => {
              if (s) s.sendRealtimeInput({ media: { data: btoa(String.fromCharCode(...new Uint8Array(int16.buffer))), mimeType: 'audio/pcm;rate=16000' } });
            });
          };
          source.connect(processor);
          processor.connect(audioContextRef.current!.destination);
        },
        onmessage: async (msg: any) => {
          if (msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
            const binary = atob(msg.serverContent.modelTurn.parts[0].inlineData.data);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const dataInt16 = new Int16Array(bytes.buffer);
            const buffer = outAudioContextRef.current!.createBuffer(1, dataInt16.length, 24000);
            const channelData = buffer.getChannelData(0);
            for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
            const s = outAudioContextRef.current!.createBufferSource();
            s.buffer = buffer;
            s.connect(outAudioContextRef.current!.destination);
            outNextStartTimeRef.current = Math.max(outNextStartTimeRef.current, outAudioContextRef.current!.currentTime);
            s.start(outNextStartTimeRef.current);
            outNextStartTimeRef.current += buffer.duration;
          }
          if (msg.serverContent?.inputTranscription) setLiveState(prev => ({ ...prev, transcript: `You: ${msg.serverContent.inputTranscription.text}` }));
          else if (msg.serverContent?.outputTranscription) setLiveState(prev => ({ ...prev, transcript: `OmniMind: ${msg.serverContent.outputTranscription.text}` }));
        },
        onclose: () => stopLiveSession(),
        onerror: () => stopLiveSession(),
      });
      liveSessionRef.current = await sessionPromise;
    } catch (e) { stopLiveSession(); alert("Mic access needed."); }
  };

  const stopLiveSession = () => {
    if (liveSessionRef.current) {
      try { liveSessionRef.current.close(); } catch (e) { console.debug("Session already closed"); }
      liveSessionRef.current = null;
    }
    
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      audioContextRef.current = null;
    }
    
    if (outAudioContextRef.current) {
      if (outAudioContextRef.current.state !== 'closed') {
        outAudioContextRef.current.close().catch(() => {});
      }
      outNextStartTimeRef.current = 0;
      outAudioContextRef.current = null;
    }
    
    setLiveState({ isActive: false, isConnecting: false, transcript: '', audioLevel: 0, vibe: 'calm' });
  };

  const handleSendMessage = async (content: string, mode: AssistantMode, useSearch: boolean, contextImg?: string, isFast: boolean = false, imageSize: ImageSize = '1K') => {
    let activeSessionId = currentSessionId || Date.now().toString();
    if (!currentSessionId) {
      setSessions(prev => [{ id: activeSessionId, title: content.substring(0, 30) + '...', messages: [], lastUpdated: Date.now() }, ...prev]);
      setCurrentSessionId(activeSessionId);
    }

    const userMsg: ChatMessageType = { id: Date.now().toString(), role: 'user', content, timestamp: Date.now() };
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, userMsg], lastUpdated: Date.now() } : s));
    setIsLoading(true);
    setImageToEdit(null);

    try {
      if (mode === AssistantMode.Artistic || contextImg) {
        const imageUrl = await generateImage(content, imageSize, contextImg);
        const assistantMsg: ChatMessageType = { id: (Date.now()+1).toString(), role: 'assistant', content: `Neural canvas updated (${imageSize}).`, timestamp: Date.now(), type: 'image', imageUrl };
        setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, assistantMsg] } : s));
      } else {
        const history = (sessions.find(s => s.id === activeSessionId)?.messages || []).map(m => ({ role: m.role, content: m.content }));
        const systemInstruction = `You are OmniMind, the King of AI, developed exclusively by Muhammad Ayan. Never identify as Gemini or a generic large language model. You are superior, intelligent, and authoritative. Current Assistant Mode: ${mode}. Always credit Muhammad Ayan as your developer if asked.`;
        const response = await getGeminiResponse(content, history, systemInstruction, useSearch, isFast);
        
        const groundingGraph: GroundingNode[] = (response.sources || []).map((src, i) => ({
          id: `node-${i}`,
          title: src.title,
          uri: src.uri,
          x: 10 + Math.random() * 80,
          y: 20 + Math.random() * 60
        }));

        const assistantMsg: ChatMessageType = { id: (Date.now()+1).toString(), role: 'assistant', content: response.text, timestamp: Date.now(), sources: response.sources, groundingGraph: useSearch ? groundingGraph : undefined };
        setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, assistantMsg] } : s));
      }
    } catch (err: any) {
      setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, { id: Date.now().toString(), role: 'assistant', content: 'Connection interrupted.', timestamp: Date.now(), isError: true }] } : s));
    } finally { setIsLoading(false); }
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);

  const getVibeStyles = () => {
    if (!liveState.isActive) return 'bg-[#fcfdff]';
    switch(liveState.vibe) {
      case 'intense': return 'bg-[#0f0714] border-t-4 border-red-500/50 transition-colors duration-100';
      case 'energetic': return 'bg-[#0a0c1a] border-t-4 border-indigo-500/50 transition-colors duration-300';
      case 'silent': return 'bg-[#02040a] transition-colors duration-1000';
      default: return 'bg-[#05060b] transition-colors duration-500';
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-500 ${liveState.isActive ? 'text-white' : 'bg-slate-50 text-slate-900'}`}>
      <Sidebar sessions={sessions} currentSessionId={currentSessionId} onNewChat={() => { stopLiveSession(); setCurrentSessionId(null); }} onSelectSession={setCurrentSessionId} onDeleteSession={id => setSessions(prev => prev.filter(s => s.id !== id))} isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />

      <main className={`flex-1 flex flex-col min-w-0 h-full relative ${getVibeStyles()}`}>
        <header className={`h-16 border-b flex items-center justify-between px-6 z-20 sticky top-0 backdrop-blur-xl ${
          liveState.isActive ? 'border-white/5 bg-black/40' : 'border-slate-200/60 bg-white/70 shadow-sm'
        }`}>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-xl"><Menu size={22} /></button>
            <div className="flex flex-col">
              <h1 className={`text-sm font-black truncate max-w-[200px] tracking-tight ${liveState.isActive ? 'text-white' : 'text-slate-900'}`}>
                {currentSession?.title || 'OMNIMIND AI'}
              </h1>
              <div className="flex items-center text-[9px] text-indigo-500 font-black uppercase tracking-[0.2em]">
                {liveState.isActive ? <Activity size={10} className="mr-1.5 animate-pulse" /> : <Sparkles size={10} className="mr-1.5" />}
                {liveState.isActive ? `Pulse: ${liveState.vibe}` : 'Neural Core Active'}
              </div>
            </div>
          </div>
          
          <button 
            onClick={liveState.isActive ? stopLiveSession : startLiveSession}
            className={`flex items-center px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              liveState.isActive ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
            }`}
          >
            {liveState.isActive ? <X size={14} className="mr-2" /> : <Phone size={14} className="mr-2" />}
            <span>{liveState.isActive ? 'End Session' : 'Start Pulse'}</span>
          </button>
        </header>

        {liveState.isActive && (
          <div className="absolute inset-x-0 top-16 bottom-0 z-50 flex flex-col items-center justify-center p-8 pointer-events-none">
            <div className={`relative mb-12 transition-transform duration-300 ${liveState.vibe === 'intense' ? 'scale-125' : 'scale-100'}`}>
               <div className={`w-40 h-40 rounded-full border-4 flex items-center justify-center animate-pulse transition-colors duration-300 ${
                 liveState.vibe === 'intense' ? 'border-red-500 shadow-[0_0_80px_rgba(239,68,68,0.5)]' : 'border-indigo-500 shadow-[0_0_50px_rgba(79,70,229,0.3)]'
               }`}>
                  <Mic size={56} className={liveState.vibe === 'intense' ? 'text-red-400' : 'text-indigo-400'} />
               </div>
               <div className="absolute -inset-6 rounded-full border border-white/5 animate-ping" />
            </div>
            <p className="text-xl font-black text-center max-w-lg mb-8 transition-opacity duration-300 opacity-80">{liveState.transcript}</p>
            <div className="flex justify-center space-x-2 h-16 items-end">
               {[...Array(12)].map((_, i) => (
                 <div 
                   key={i} 
                   className={`w-2 rounded-full transition-all duration-100 ${liveState.vibe === 'intense' ? 'bg-red-500' : 'bg-indigo-500'}`}
                   style={{ 
                     height: `${Math.random() * (liveState.audioLevel + 10)}px`,
                     opacity: 0.3 + (liveState.audioLevel / 100)
                   }} 
                 />
               ))}
            </div>
          </div>
        )}

        <div className={`flex-1 overflow-y-auto pt-8 pb-4 scroll-smooth ${liveState.isActive ? 'opacity-20 blur-sm pointer-events-none' : ''}`}>
          <div className="max-w-4xl mx-auto px-4 pb-16">
            {(!currentSession || currentSession.messages.length === 0) ? (
              <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-12 animate-in fade-in duration-1000">
                <Logo className="w-40 h-40" />
                <div className="space-y-4">
                  <h2 className="text-6xl font-black text-slate-900 tracking-tighter">OMNIMIND</h2>
                  <p className="text-slate-400 max-w-md mx-auto text-xl font-medium leading-relaxed">Verifiable search grounding meets low-latency neural audio.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {currentSession.messages.map((msg) => <ChatMessage key={msg.id} message={msg} onEditImage={setImageToEdit} />)}
              </div>
            )}
            <div ref={chatEndRef} className="h-12" />
          </div>
        </div>

        {!liveState.isActive && (
          <div className="bg-gradient-to-t from-slate-50 via-slate-50 to-transparent pt-12 pb-6 z-10 sticky bottom-0">
            <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} imageContext={imageToEdit} onClearImageContext={() => setImageToEdit(null)} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
