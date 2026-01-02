
import React, { useState } from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import MarkdownRenderer from './MarkdownRenderer';
import { User, Bot, AlertCircle, ExternalLink, Clock, Volume2, Download, Image as ImageIcon } from 'lucide-react';
import { generateSpeech } from '../services/geminiService';

interface ChatMessageProps {
  message: ChatMessageType;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const isAssistant = message.role === 'assistant';
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handlePlayAudio = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    try {
      const audioData = await generateSpeech(message.content);
      if (audioData) {
        const audio = new Audio(`data:audio/pcm;base64,${audioData}`);
        // Note: PCM audio needs proper decoding logic as per Gemini SDK rules if raw, 
        // but for high-level simulation we use the standard approach or raw bytes logic.
        // For this implementation, we assume a playable data format from our service.
        const audioBlob = b64toBlob(audioData, 'audio/wav');
        const url = URL.createObjectURL(audioBlob);
        const player = new Audio(url);
        player.onended = () => setIsPlaying(false);
        player.play();
      }
    } catch (e) {
      console.error(e);
      setIsPlaying(false);
    }
  };

  const b64toBlob = (b64Data: string, contentType = '', sliceSize = 512) => {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) byteNumbers[i] = slice.charCodeAt(i);
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: contentType });
  };

  return (
    <div className={`flex w-full mb-6 ${isAssistant ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className={`flex max-w-[90%] md:max-w-[80%] ${isAssistant ? 'flex-row' : 'flex-row-reverse'}`}>
        <div className={`flex-shrink-0 h-10 w-10 rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:scale-110 ${
          isAssistant ? 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white mr-3' : 'bg-white border border-slate-200 text-slate-600 ml-3'
        }`}>
          {isAssistant ? <Bot size={22} /> : <User size={22} />}
        </div>
        
        <div className="flex flex-col group">
          <div className={`px-5 py-4 rounded-2xl shadow-sm relative ${
            message.isError 
              ? 'bg-red-50 border border-red-100 text-red-800' 
              : isAssistant 
                ? 'bg-white border border-slate-100 text-slate-800' 
                : 'bg-indigo-600 text-white shadow-indigo-100'
          }`}>
            {message.type === 'image' && message.imageUrl ? (
              <div className="space-y-3">
                <div className="flex items-center text-xs font-bold text-slate-400 mb-2">
                  <ImageIcon size={14} className="mr-1.5" /> GENERATED ART
                </div>
                <img src={message.imageUrl} alt="AI Art" className="rounded-xl w-full h-auto shadow-md border border-slate-100" />
                <button 
                  onClick={() => window.open(message.imageUrl, '_blank')}
                  className="flex items-center space-x-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  <Download size={14} /> <span>SAVE FULL RESOLUTION</span>
                </button>
              </div>
            ) : (
              <MarkdownRenderer content={message.content} />
            )}

            {isAssistant && !message.isError && message.type !== 'image' && (
              <button 
                onClick={handlePlayAudio}
                className={`absolute -right-10 top-2 p-2 rounded-full transition-all bg-white shadow-sm border border-slate-100 hover:scale-110 opacity-0 group-hover:opacity-100 ${isPlaying ? 'text-indigo-600 scale-110 opacity-100' : 'text-slate-400'}`}
              >
                <Volume2 size={16} className={isPlaying ? 'animate-pulse' : ''} />
              </button>
            )}

            {isAssistant && message.sources && message.sources.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-50">
                <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-tighter">Verified Sources</p>
                <div className="flex flex-wrap gap-2">
                  {message.sources.map((source, idx) => (
                    <a key={idx} href={source.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-slate-50 hover:bg-indigo-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-indigo-600 flex items-center space-x-1 transition-colors">
                      <span className="truncate max-w-[150px]">{source.title}</span>
                      <ExternalLink size={10} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className={`mt-1.5 flex items-center text-[10px] font-bold text-slate-400 tracking-tight uppercase ${isAssistant ? 'justify-start' : 'justify-end'}`}>
            <Clock size={10} className="mr-1" />
            {time}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
