
import React, { useState } from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import MarkdownRenderer from './MarkdownRenderer';
import { User, Bot, Clock, Volume2, Download, Image as ImageIcon, Loader2, ExternalLink, Edit3 } from 'lucide-react';
import { generateSpeech } from '../services/geminiService';

interface ChatMessageProps {
  message: ChatMessageType;
  onEditImage?: (imageUrl: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onEditImage }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const isAssistant = message.role === 'assistant';
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const decodeBase64 = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const handlePlayAudio = async () => {
    if (isPlaying || isAudioLoading) return;
    
    setIsAudioLoading(true);
    try {
      const base64Audio = await generateSpeech(message.content);
      if (base64Audio) {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const audioBytes = decodeBase64(base64Audio);
        const audioBuffer = await decodeAudioData(audioBytes, audioCtx, 24000, 1);
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        source.onended = () => {
          setIsPlaying(false);
          audioCtx.close();
        };
        setIsPlaying(true);
        source.start();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAudioLoading(false);
    }
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
                <div className="relative group/img">
                  <img src={message.imageUrl} alt="AI Art" className="rounded-xl w-full h-auto shadow-md border border-slate-100" />
                  {onEditImage && (
                    <button 
                      onClick={() => onEditImage(message.imageUrl!)}
                      className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md p-2.5 rounded-xl text-indigo-600 shadow-xl opacity-0 group-hover/img:opacity-100 transition-all hover:bg-indigo-600 hover:text-white flex items-center space-x-2 font-bold text-[10px]"
                    >
                      <Edit3 size={14} />
                      <span>REMIX ART</span>
                    </button>
                  )}
                </div>
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
                disabled={isAudioLoading}
                className={`absolute -right-10 top-2 p-2 rounded-full transition-all bg-white shadow-sm border border-slate-100 hover:scale-110 opacity-0 group-hover:opacity-100 flex items-center justify-center ${
                  isPlaying ? 'text-indigo-600 scale-110 opacity-100' : 'text-slate-400'
                } ${isAudioLoading ? 'opacity-100' : ''}`}
              >
                {isAudioLoading ? <Loader2 size={16} className="animate-spin text-indigo-500" /> : <Volume2 size={16} />}
              </button>
            )}
          </div>
          <div className={`mt-1.5 flex items-center text-[10px] font-bold text-slate-400 tracking-tight uppercase ${isAssistant ? 'justify-start' : 'justify-end'}`}>
            <Clock size={10} className="mr-1" /> {time}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
