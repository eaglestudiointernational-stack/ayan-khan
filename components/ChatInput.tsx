
import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Languages, Terminal, PenTool, BookOpen, Briefcase } from 'lucide-react';
import { AssistantMode } from '../types';

interface ChatInputProps {
  onSendMessage: (message: string, mode: AssistantMode) => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<AssistantMode>(AssistantMode.General);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim(), mode);
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

  const modeIcons = {
    [AssistantMode.General]: <Sparkles size={16} />,
    [AssistantMode.Creative]: <PenTool size={16} />,
    [AssistantMode.Technical]: <Terminal size={16} />,
    [AssistantMode.Educational]: <BookOpen size={16} />,
    [AssistantMode.Productivity]: <Briefcase size={16} />,
    [AssistantMode.Urdu]: <Languages size={16} />,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pb-6 w-full">
      <div className="flex overflow-x-auto pb-2 mb-2 gap-2 no-scrollbar">
        {Object.values(AssistantMode).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-shrink-0 flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              mode === m 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            {modeIcons[m]}
            <span>{m}</span>
          </button>
        ))}
      </div>

      <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 transition-all focus-within:ring-2 focus-within:ring-indigo-500/20">
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message OmniMind (${mode})...`}
          className="w-full px-4 py-4 pr-14 bg-transparent border-none focus:ring-0 resize-none max-h-48 text-slate-800 placeholder-slate-400"
          disabled={isLoading}
        />
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading}
          className={`absolute right-3 bottom-3 p-2 rounded-xl transition-all ${
            input.trim() && !isLoading
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-slate-100 text-slate-400'
          }`}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send size={18} />
          )}
        </button>
      </div>
      <p className="text-center text-[10px] text-slate-400 mt-2">
        OmniMind AI can provide helpful, creative, and technical content. Accuracy varies.
      </p>
    </div>
  );
};

export default ChatInput;
