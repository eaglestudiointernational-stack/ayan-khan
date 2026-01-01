
import React from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import MarkdownRenderer from './MarkdownRenderer';
import { User, Bot, AlertCircle, ExternalLink, Clock } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageType;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isAssistant = message.role === 'assistant';
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex w-full mb-6 ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] ${isAssistant ? 'flex-row' : 'flex-row-reverse'}`}>
        <div className={`flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center ${
          isAssistant ? 'bg-indigo-600 text-white mr-3' : 'bg-slate-200 text-slate-600 ml-3'
        }`}>
          {isAssistant ? <Bot size={20} /> : <User size={20} />}
        </div>
        
        <div className="flex flex-col">
          <div className={`px-4 py-3 rounded-2xl shadow-sm ${
            message.isError 
              ? 'bg-red-50 border border-red-200 text-red-800' 
              : isAssistant 
                ? 'bg-white border border-slate-100 text-slate-800' 
                : 'bg-indigo-600 text-white'
          }`}>
            {message.isError && (
              <div className="flex items-center mb-2 text-red-600 font-semibold text-sm">
                <AlertCircle size={14} className="mr-1" />
                Error
              </div>
            )}
            
            <MarkdownRenderer content={message.content} />

            {isAssistant && message.sources && message.sources.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-500 mb-2 flex items-center">
                  <ExternalLink size={12} className="mr-1" /> SOURCES
                </p>
                <div className="flex flex-wrap gap-2">
                  {message.sources.map((source, idx) => (
                    <a
                      key={idx}
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded px-2 py-1 text-indigo-600 truncate max-w-[200px]"
                    >
                      {source.title}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className={`mt-1 flex items-center text-[10px] text-slate-400 ${isAssistant ? 'justify-start' : 'justify-end'}`}>
            <Clock size={10} className="mr-1" />
            {time}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
