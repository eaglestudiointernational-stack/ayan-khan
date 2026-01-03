
import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Languages, Terminal, Palette, Briefcase, Globe, Mic, X, Image as ImageIcon, Loader2, Bolt, ChevronDown, Brain, Video, Clapperboard } from 'lucide-react';
import { AssistantMode, ImageSize, VideoAspectRatio, VideoResolution } from '../types';

interface ChatInputProps {
  onSendMessage: (
    message: string, 
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
  ) => void;
  isLoading: boolean;
  imageContext?: string | null;
  onClearImageContext?: () => void;
}

// Define the expected AIStudio interface to satisfy TypeScript requirements
interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
    aistudio: AIStudio;
  }
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  isLoading, 
  imageContext, 
  onClearImageContext 
}) => {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<AssistantMode>(AssistantMode.General);
  const [useSearch, setUseSearch] = useState(true);
  const [isFast, setIsFast] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [imageSize, setImageSize] = useState<ImageSize>("1K");
  const [videoRatio, setVideoRatio] = useState<VideoAspectRatio>("16:9");
  const [videoRes, setVideoRes] = useState<VideoResolution>("720p");
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (imageContext) setMode(AssistantMode.Artistic);
  }, [imageContext]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = mode === AssistantMode.Urdu ? 'ur-PK' : 'en-US';
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join('');
        setInput(transcript);
      };
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = () => setIsRecording(false);
      recognitionRef.current = recognition;
    }
  }, [mode]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() && !isLoading) {
      if (mode === AssistantMode.Artistic || mode === AssistantMode.Cinema || imageContext) {
        // Ensure API key is selected for paid features
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await window.aistudio.openSelectKey();
        }
      }

      onSendMessage(input.trim(), mode, useSearch, {
        imageContext: imageContext || undefined,
        isFast,
        imageSize,
        isThinking,
        videoRatio,
        videoRes
      });
      setInput('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const toggleRecording = () => {
    if (isRecording) recognitionRef.current.stop();
    else {
      try { recognitionRef.current.start(); setIsRecording(true); } 
      catch (e) { setIsRecording(false); }
    }
  };

  const modeIcons = {
    [AssistantMode.General]: <Sparkles size={16} />,
    [AssistantMode.Artistic]: <Palette size={16} />,
    [AssistantMode.Cinema]: <Clapperboard size={16} />,
    [AssistantMode.Technical]: <Terminal size={16} />,
    [AssistantMode.Urdu]: <Languages size={16} />,
    [AssistantMode.Productivity]: <Briefcase size={16} />,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pb-6 w-full">
      {imageContext && (
        <div className="mb-4 animate-in slide-in-from-bottom-4 flex items-center justify-between bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="relative group">
              <img src={imageContext} className="w-16 h-16 object-cover rounded-xl shadow-lg border-2 border-white" alt="Context" />
              <button 
                onClick={onClearImageContext}
                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Visual Remix Enabled</span>
              <span className="text-xs text-slate-500 font-medium">Explain the transition you want to see...</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between mb-3 gap-2 px-1">
        <div className="flex overflow-x-auto gap-2 no-scrollbar py-1">
          {Object.values(AssistantMode).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-shrink-0 flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                mode === m 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 border-indigo-600' 
                  : 'bg-white text-slate-600 hover:border-indigo-300 border-slate-200'
              }`}
            >
              {modeIcons[m]}
              <span>{m}</span>
            </button>
          ))}
        </div>
        
        <div className="flex items-center space-x-2">
          {mode === AssistantMode.Artistic && (
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-1 py-1">
              {(['1K', '2K', '4K'] as ImageSize[]).map((size) => (
                <button
                  key={size}
                  onClick={() => setImageSize(size)}
                  className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-tighter transition-all ${
                    imageSize === size 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          )}

          {mode === AssistantMode.Cinema && (
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2 py-1 space-x-2">
               <select 
                 value={videoRatio} 
                 onChange={(e) => setVideoRatio(e.target.value as VideoAspectRatio)}
                 className="bg-transparent text-[9px] font-black border-none focus:ring-0 uppercase tracking-widest text-indigo-600"
               >
                 <option value="16:9">16:9</option>
                 <option value="9:16">9:16</option>
               </select>
               <div className="w-px h-3 bg-slate-200" />
               <select 
                 value={videoRes} 
                 onChange={(e) => setVideoRes(e.target.value as VideoResolution)}
                 className="bg-transparent text-[9px] font-black border-none focus:ring-0 uppercase tracking-widest text-indigo-600"
               >
                 <option value="720p">720p</option>
                 <option value="1080p">1080p</option>
               </select>
            </div>
          )}

          <button
            onClick={() => {
              setIsThinking(!isThinking);
              if (!isThinking) setIsFast(false); 
            }}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
              isThinking 
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm shadow-indigo-100' 
                : 'bg-white text-slate-400 border-slate-200'
            }`}
            title="Deep Thought Mode"
          >
            <Brain size={14} className={isThinking ? 'fill-current' : ''} />
            <span className="hidden sm:inline">{isThinking ? 'Think ON' : 'Think OFF'}</span>
          </button>

          <button
            onClick={() => setUseSearch(!useSearch)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
              useSearch 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-white text-slate-400 border-slate-200'
            }`}
          >
            <Globe size={14} className={useSearch ? 'animate-spin-slow' : ''} />
            <span className="hidden sm:inline">{useSearch ? 'Search ON' : 'Search OFF'}</span>
          </button>
        </div>
      </div>

      <div className={`relative bg-white rounded-3xl shadow-2xl border-2 transition-all duration-300 group ${
        isRecording ? 'border-indigo-500 ring-8 ring-indigo-500/5 scale-[1.01]' : 'border-slate-100 focus-within:border-indigo-400'
      }`}>
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? "Listening..." : mode === AssistantMode.Cinema ? "Describe your cinematic vision..." : `Message OmniMind (${mode})...`}
          className="w-full px-5 py-5 pr-28 bg-transparent border-none focus:ring-0 resize-none max-h-48 text-slate-800 placeholder-slate-400 font-medium text-base leading-relaxed"
          disabled={isLoading}
        />
        
        <div className="absolute right-3 bottom-3 flex items-center space-x-2">
          {input && <button onClick={() => setInput('')} className="p-2 text-slate-400 hover:text-red-500"><X size={18} /></button>}
          <button
            onClick={toggleRecording}
            className={`relative p-3 rounded-2xl transition-all ${isRecording ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400 hover:text-indigo-600'}`}
          >
            <Mic size={22} />
          </button>
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className={`p-3 rounded-2xl transition-all ${input.trim() && !isLoading ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-300'}`}
          >
            {isLoading ? <Loader2 size={22} className="animate-spin" /> : <Send size={22} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
