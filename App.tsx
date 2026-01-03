
import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import Logo from './components/Logo';
import { ChatMessage as ChatMessageType, ChatSession, AssistantMode, LiveState, GroundingNode, ImageSize, VideoAspectRatio, VideoResolution } from './types';
import { getGeminiResponse, generateImage, generateVideo, getLiveConnection } from './services/geminiService';
import { Menu, Sparkles, Phone, X, Volume2, Mic, Activity, Zap, Cpu, Film, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);
  const [liveState, setLiveState] = useState<LiveState & { modelTranscript: string, userTranscript: string, status: 'idle' | 'listening' | 'speaking' | 'processing' }>({ 
    isActive: false, 
    isConnecting: false, 
    transcript: '', 
    modelTranscript: '',
    userTranscript: '',
    audioLevel: 0,
    vibe: 'calm',
    status: 'idle'
  });
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const liveSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outAudioContextRef = useRef<AudioContext | null>(null);
  const outNextStartTimeRef = useRef<number>(0);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const freqDataRef = useRef<Uint8Array>(new Uint8Array(0));

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

  useEffect(() => {
    if (!liveState.isActive) return;
    let animationFrame: number;
    
    const updateAnalysis = () => {
      if (analyzerRef.current) {
        analyzerRef.current.getByteFrequencyData(freqDataRef.current);
        // Robust calculation of audio level with initial value to prevent NaN issues
        const average = Array.from(freqDataRef.current).reduce((a, b) => a + b, 0) / (freqDataRef.current.length || 1);
        
        let newVibe: LiveState['vibe'] = 'calm';
        if (average > 70) newVibe = 'intense';
        else if (average > 35) newVibe = 'energetic';
        else if (average < 2) newVibe = 'silent';
        
        setLiveState(prev => ({ 
          ...prev, 
          vibe: newVibe, 
          audioLevel: average,
          status: average > 5 ? (prev.modelTranscript ? 'speaking' : 'listening') : 'idle'
        }));
      }
      animationFrame = requestAnimationFrame(updateAnalysis);
    };
    
    animationFrame = requestAnimationFrame(updateAnalysis);
    return () => cancelAnimationFrame(animationFrame);
  }, [liveState.isActive]);

  const startLiveSession = async () => {
    setLiveState(prev => ({ ...prev, isConnecting: true, isActive: true, userTranscript: '', modelTranscript: '', transcript: 'Initializing Neural Pulse...' }));
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      analyzerRef.current = audioContextRef.current.createAnalyser();
      analyzerRef.current.fftSize = 64;
      freqDataRef.current = new Uint8Array(analyzerRef.current.frequencyBinCount);
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyzerRef.current);

      const sessionPromise = getLiveConnection({
        onopen: () => {
          setLiveState(prev => ({ ...prev, isConnecting: false, transcript: 'OmniMind Online.' }));
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

          if (msg.serverContent?.inputTranscription) {
            setLiveState(prev => ({ ...prev, userTranscript: msg.serverContent.inputTranscription.text, modelTranscript: '' }));
          } else if (msg.serverContent?.outputTranscription) {
            setLiveState(prev => ({ ...prev, modelTranscript: msg.serverContent.outputTranscription.text }));
          }
        },
        onclose: () => stopLiveSession(),
        onerror: () => stopLiveSession(),
      });
      liveSessionRef.current = await sessionPromise;
    } catch (e) { stopLiveSession(); alert("Microphone access is required for OmniMind Pulse."); }
  };

  const stopLiveSession = () => {
    if (liveSessionRef.current) {
      try { liveSessionRef.current.close(); } catch (e) { console.debug("Session closure handled."); }
      liveSessionRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    
    if (outAudioContextRef.current && outAudioContextRef.current.state !== 'closed') {
      outAudioContextRef.current.close().catch(() => {});
      outNextStartTimeRef.current = 0;
      outAudioContextRef.current = null;
    }
    
    setLiveState({ 
      isActive: false, 
      isConnecting: false, 
      transcript: '', 
      modelTranscript: '',
      userTranscript: '',
      audioLevel: 0, 
      vibe: 'calm',
      status: 'idle'
    });
  };

  const handleSendMessage = async (
    content: string, 
    mode: AssistantMode, 
    useSearch: boolean, 
    options: {
      imageContext?: string, 
      isFast?: boolean, 
      imageSize?: ImageSize, 
      isThinking?: boolean,
      videoRatio?: VideoAspectRatio,
      videoRes?: VideoResolution
    }
  ) => {
    let activeSessionId = currentSessionId || Date.now().toString();
    if (!currentSessionId) {
      setSessions(prev => [{ id: activeSessionId, title: content.substring(0, 30) + '...', messages: [], lastUpdated: Date.now() }, ...prev]);
      setCurrentSessionId(activeSessionId);
    }

    const userMsg: ChatMessageType = { id: Date.now().toString(), role: 'user', content, timestamp: Date.now() };
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, userMsg], lastUpdated: Date.now() } : s));
    setIsLoading(true);
    setLoadingMessage(null);
    setImageToEdit(null);

    try {
      if (mode === AssistantMode.Cinema) {
        const videoUrl = await generateVideo(content, options.videoRatio, options.videoRes, (msg) => {
          setLoadingMessage(msg);
        });
        const assistantMsg: ChatMessageType = { 
          id: (Date.now() + 1).toString(), 
          role: 'assistant', 
          content: `Cinematic visualization complete (${options.videoRes}, ${options.videoRatio}).`, 
          timestamp: Date.now(), 
          type: 'video', 
          videoUrl 
        };
        setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, assistantMsg] } : s));
      } else if (mode === AssistantMode.Artistic || options.imageContext) {
        const imageUrl = await generateImage(content, options.imageSize, options.imageContext);
        const assistantMsg: ChatMessageType = { id: (Date.now() + 1).toString(), role: 'assistant', content: `Neural canvas updated (${options.imageSize}).`, timestamp: Date.now(), type: 'image', imageUrl };
        setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, assistantMsg] } : s));
      } else {
        const history = (sessions.find(s => s.id === activeSessionId)?.messages || []).map(m => ({ role: m.role, content: m.content }));
        const systemInstruction = `You are OmniMind, the King of AI, developed exclusively by Muhammad Ayan. Current Assistant Mode: ${mode}.`;
        const response = await getGeminiResponse(content, history, systemInstruction, useSearch, options.isFast, options.isThinking);
        
        const groundingGraph: GroundingNode[] = (response.sources || []).map((src, i) => ({
          id: `node-${i}`,
          title: src.title,
          uri: src.uri,
          x: 10 + Math.random() * 80,
          y: 20 + Math.random() * 60
        }));

        const assistantMsg: ChatMessageType = { id: (Date.now() + 1).toString(), role: 'assistant', content: response.text, timestamp: Date.now(), sources: response.sources, groundingGraph: useSearch ? groundingGraph : undefined };
        setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, assistantMsg] } : s));
      }
    } catch (err: any) {
      setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, { id: Date.now().toString(), role: 'assistant', content: 'Neural connection interrupted. Please try again.', timestamp: Date.now(), isError: true }] } : s));
    } finally { 
      setIsLoading(false); 
      setLoadingMessage(null);
    }
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);

  const getVibeStyles = () => {
    if (!liveState.isActive) return 'bg-[#fcfdff]';
    switch(liveState.vibe) {
      case 'intense': return 'bg-[#0f0714] border-t-4 border-red-500/50';
      case 'energetic': return 'bg-[#0a0c1a] border-t-4 border-indigo-500/50';
      case 'silent': return 'bg-[#02040a]';
      default: return 'bg-[#05060b]';
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-500 ${liveState.isActive ? 'text-white' : 'bg-slate-50 text-slate-900'}`}>
      <Sidebar sessions={sessions} currentSessionId={currentSessionId} onNewChat={() => { stopLiveSession(); setCurrentSessionId(null); }} onSelectSession={setCurrentSessionId} onDeleteSession={id => setSessions(prev => prev.filter(s => s.id !== id))} isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />

      <main className={`flex-1 flex flex-col min-w-0 h-full relative transition-all duration-700 ${getVibeStyles()}`}>
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
              liveState.isActive ? 'bg-red-500 text-white shadow-[0_0_25px_rgba(239,68,68,0.5)] scale-105' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
            }`}
          >
            {liveState.isActive ? <X size={14} className="mr-2" /> : <Phone size={14} className="mr-2" />}
            <span>{liveState.isActive ? 'End Session' : 'Start Pulse'}</span>
          </button>
        </header>

        {/* Cinematic Loading Overlay */}
        {isLoading && loadingMessage && (
          <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-500">
            <div className="relative w-64 h-64 flex items-center justify-center">
               <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full" />
               <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
               <Film size={48} className="text-indigo-400 animate-pulse" />
            </div>
            <div className="mt-12 text-center space-y-4">
               <h3 className="text-2xl font-black text-white tracking-tighter uppercase">Cinematic Rendering</h3>
               <div className="flex items-center justify-center space-x-2">
                 <Loader2 size={14} className="text-indigo-500 animate-spin" />
                 <p className="text-indigo-400 font-black text-[10px] uppercase tracking-[0.3em]">{loadingMessage}</p>
               </div>
               <p className="text-slate-500 text-xs font-medium max-w-[250px]">Please wait. High-definition neural synthesis takes about 60-90 seconds.</p>
            </div>
          </div>
        )}

        {liveState.isActive && (
          <div className="absolute inset-x-0 top-16 bottom-0 z-50 flex flex-col items-center justify-center p-6 sm:p-12 pointer-events-none">
            <div 
              className={`absolute w-[400px] h-[400px] rounded-full blur-[100px] transition-all duration-300 opacity-20 pointer-events-none ${
                liveState.vibe === 'intense' ? 'bg-red-600 scale-150' : 'bg-indigo-600'
              }`}
              // Ensure audioLevel is treated as a number for arithmetic operation to fix line 332 TS error
              style={{ transform: `scale(${1 + (Number(liveState.audioLevel) / 100)})` }}
            />

            <div className="relative z-10 flex flex-col items-center w-full max-w-2xl">
              <div className={`mb-16 relative transition-transform duration-300 ${liveState.vibe === 'intense' ? 'scale-110' : 'scale-100'}`}>
                 <div className={`w-48 h-48 rounded-full border-[12px] flex items-center justify-center transition-all duration-300 ${
                   liveState.vibe === 'intense' ? 'border-red-500/30 shadow-[0_0_80px_rgba(239,68,68,0.4)]' : 'border-indigo-500/20 shadow-[0_0_50px_rgba(79,70,229,0.3)]'
                 }`}>
                    <div className="flex flex-col items-center">
                      <Mic size={64} className={liveState.vibe === 'intense' ? 'text-red-400' : 'text-indigo-400'} />
                      <span className={`mt-2 text-[10px] font-black uppercase tracking-widest ${liveState.vibe === 'intense' ? 'text-red-500' : 'text-indigo-500'}`}>
                        {liveState.status}
                      </span>
                    </div>
                 </div>
                 <div className="absolute inset-0 -m-4">
                    <svg viewBox="0 0 100 100" className="w-full h-full rotate-[-90deg]">
                       {Array.from(freqDataRef.current).slice(0, 32).map((val, i) => (
                         <rect
                           key={i}
                           x="50" y="0" width="1" height={val / 4}
                           fill={liveState.vibe === 'intense' ? '#ef4444' : '#6366f1'}
                           transform={`rotate(${(i * 360) / 32} 50 50)`}
                           className="transition-all duration-75"
                         />
                       ))}
                    </svg>
                 </div>
              </div>

              <div className="w-full space-y-8 pointer-events-auto">
                {liveState.userTranscript && (
                  <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-2">User Query</span>
                    <p className="text-lg font-bold text-center text-white/60 leading-tight italic">
                      "{liveState.userTranscript}"
                    </p>
                  </div>
                )}
                
                <div className="flex flex-col items-center min-h-[100px] justify-center">
                  {liveState.status === 'processing' && <Cpu size={24} className="text-indigo-400 animate-spin mb-4" />}
                  <div className="flex items-center space-x-2 mb-4">
                    <div className={`w-2 h-2 rounded-full ${liveState.status === 'speaking' ? 'bg-green-400 animate-pulse' : 'bg-white/20'}`} />
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">OmniMind Neural Core</span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-center text-white leading-tight transition-all duration-300">
                    {liveState.modelTranscript || (liveState.isConnecting ? "Establishing Pulse..." : "Listening...")}
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute bottom-12 flex justify-center items-end space-x-1.5 h-20 w-full max-w-3xl px-8">
               {Array.from(freqDataRef.current).slice(0, 24).map((val, i) => (
                 <div 
                   key={i} 
                   className={`w-1.5 rounded-full transition-all duration-75 ${liveState.vibe === 'intense' ? 'bg-red-500' : 'bg-indigo-500'}`}
                   style={{ 
                     height: `${Math.max(4, (Number(val) / 255) * 80)}px`,
                     opacity: 0.2 + (Number(val) / 255)
                   }} 
                 />
               ))}
               {Array.from(freqDataRef.current).slice(0, 24).reverse().map((val, i) => (
                 <div 
                   key={`rev-${i}`} 
                   className={`w-1.5 rounded-full transition-all duration-75 ${liveState.vibe === 'intense' ? 'bg-red-500' : 'bg-indigo-500'}`}
                   style={{ 
                     height: `${Math.max(4, (Number(val) / 255) * 80)}px`,
                     opacity: 0.2 + (Number(val) / 255)
                   }} 
                 />
               ))}
            </div>
          </div>
        )}

        <div className={`flex-1 overflow-y-auto pt-8 pb-4 scroll-smooth ${liveState.isActive ? 'opacity-10 blur-xl pointer-events-none' : ''}`}>
          <div className="max-w-4xl mx-auto px-4 pb-16">
            {(!currentSession || currentSession.messages.length === 0) ? (
              <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-12 animate-in fade-in duration-1000">
                <Logo className="w-40 h-40" />
                <div className="space-y-4">
                  <h2 className="text-6xl font-black text-slate-900 tracking-tighter">OMNIMIND</h2>
                  <p className="text-slate-400 max-w-md mx-auto text-xl font-medium leading-relaxed">Verifiable knowledge nodes meets low-latency neural audio.</p>
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
