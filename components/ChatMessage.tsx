
import React, { useState } from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import MarkdownRenderer from './MarkdownRenderer';
import { User, Bot, Clock, Volume2, Download, Image as ImageIcon, Loader2, ExternalLink, Edit3, Share2 } from 'lucide-react';
import { generateSpeech } from '../services/geminiService';
import GroundingConstellation from './GroundingConstellation';

interface ChatMessageProps {
  message: ChatMessageType;
  onEditImage?: (imageUrl: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onEditImage }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const isAssistant = message.role === 'assistant';
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handlePlayAudio = async () => {
    if (isPlaying || isAudioLoading) return;
    setIsAudioLoading(true);
    try {
      const base64Audio = await generateSpeech(message.content);
      if (base64Audio) {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const binary = atob(base64Audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const dataInt16 = new Int16Array(bytes.buffer);
        const buffer = audioCtx.createBuffer(1, dataInt16.length, 24000);
        const channelData = buffer.getChannelData(0);
        for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.onended = () => { 
          setIsPlaying(false); 
          if (audioCtx.state !== 'closed') {
            audioCtx.close().catch(() => {}); 
          }
        };
        setIsPlaying(true);
        source.start();
      }
    } catch (e) { 
      console.error(e); 
      setIsPlaying(false);
    } 
    finally { setIsAudioLoading(false); }
  };

  return (
    <div className={`flex w-full mb-8 ${isAssistant ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-3 duration-500`}>
      <div className={`flex max-w-[92%] md:max-w-[85%] ${isAssistant ? 'flex-row' : 'flex-row-reverse'}`}>
        <div className={`flex-shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center shadow-xl transition-all hover:rotate-6 ${
          isAssistant ? 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white mr-4' : 'bg-white border border-slate-200 text-slate-600 ml-4'
        }`}>
          {isAssistant ? <Bot size={24} /> : <User size={24} />}
        </div>
        
        <div className="flex flex-col group relative">
          <div className={`px-6 py-5 rounded-3xl shadow-sm relative transition-all ${
            message.isError 
              ? 'bg-red-50 border border-red-100 text-red-800' 
              : isAssistant 
                ? 'bg-white border border-slate-100 text-slate-800 hover:shadow-md' 
                : 'bg-indigo-600 text-white shadow-indigo-100 hover:shadow-indigo-200'
          }`}>
            {message.type === 'image' && message.imageUrl ? (
              <div className="space-y-4">
                <div className="flex items-center text-[10px] font-black text-slate-400 tracking-widest uppercase">
                  <ImageIcon size={14} className="mr-2" /> Neural Generation
                </div>
                <div className="relative group/img overflow-hidden rounded-2xl border border-slate-100 shadow-lg">
                  <img src={message.imageUrl} alt="AI Art" className="w-full h-auto transition-transform duration-700 group-hover/img:scale-105" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center space-x-3 backdrop-blur-[2px]">
                    {onEditImage && (
                      <button 
                        onClick={() => onEditImage(message.imageUrl!)}
                        className="bg-white text-indigo-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-transform"
                      >
                        Remix Art
                      </button>
                    )}
                    <button 
                      onClick={() => window.open(message.imageUrl, '_blank')}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-transform"
                    >
                      Full Size
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <MarkdownRenderer content={message.content} />
                {message.groundingGraph && <GroundingConstellation nodes={message.groundingGraph} />}
              </>
            )}

            {isAssistant && !message.isError && message.type !== 'image' && (
              <div className="absolute -right-12 top-0 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-all">
                <button 
                  onClick={handlePlayAudio}
                  disabled={isAudioLoading}
                  className={`p-2.5 rounded-full bg-white shadow-lg border border-slate-100 hover:scale-110 flex items-center justify-center ${
                    isPlaying ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-500'
                  }`}
                >
                  {isAudioLoading ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
                </button>
                <button className="p-2.5 rounded-full bg-white shadow-lg border border-slate-100 hover:scale-110 text-slate-400 hover:text-indigo-500">
                  <Share2 size={16} />
                </button>
              </div>
            )}
          </div>
          <div className={`mt-2 flex items-center text-[9px] font-black text-slate-400 tracking-widest uppercase ${isAssistant ? 'justify-start ml-2' : 'justify-end mr-2'}`}>
             {time}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
