
import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Languages, Terminal, Palette, Briefcase, Globe, Mic, MicOff } from 'lucide-react';
import { AssistantMode } from '../types';

interface ChatInputProps {
  onSendMessage: (message: string, mode: AssistantMode, useSearch: boolean) => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<AssistantMode>(AssistantMode.General);
  const [useSearch, setUseSearch] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim(), mode, useSearch);
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
    if (isRecording) {
      setIsRecording(false);
    } else {
      setIsRecording(true);
      // Logic for speech-to-text would go here
      setTimeout(() => setIsRecording(false), 3000);
    }
  };

  const modeIcons = {
    [AssistantMode.General]: <Sparkles size={16} />,
    [AssistantMode.Artistic]: <Palette size={16} />,
    [AssistantMode.Technical]: <Terminal size={16} />,
    [AssistantMode.Urdu]: <Languages size={16} />,
    [AssistantMode.Productivity]: <Briefcase size={16} />,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pb-6 w-full">
      <div className="flex items-center justify-between mb-3 px-1">
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
        
        <button
          onClick={() => setUseSearch(!useSearch)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
            useSearch 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-slate-50 text-slate-400 border-slate-200'
          }`}
          title="Toggle Google Search Grounding"
        >
          <Globe size={14} className={useSearch ? 'animate-spin-slow' : ''} />
          <span className="hidden sm:inline">{useSearch ? 'Search ON' : 'Search OFF'}</span>
        </button>
      </div>

      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 transition-all focus-within:ring-4 focus-within:ring-indigo-500/10">
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={mode === AssistantMode.Artistic ? "Describe the image you want to create..." : `Ask OmniMind anything...`}
          className="w-full px-4 py-4 pr-24 bg-transparent border-none focus:ring-0 resize-none max-h-48 text-slate-800 placeholder-slate-400 font-medium"
          disabled={isLoading}
        />
        <div className="absolute right-2 bottom-2.5 flex items-center space-x-1">
          <button
            onClick={toggleRecording}
            className={`p-2 rounded-xl transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            {isRecording ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className={`p-2.5 rounded-xl transition-all ${
              input.trim() && !isLoading
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
