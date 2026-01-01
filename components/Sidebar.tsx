
import React from 'react';
import { PlusCircle, MessageSquare, Trash2, Github, Settings, ChevronLeft } from 'lucide-react';
import { ChatSession } from '../types';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  isOpen,
  onToggle
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-20 md:hidden" 
          onClick={onToggle}
        />
      )}
      
      <div className={`fixed inset-y-0 left-0 z-30 w-72 bg-slate-900 text-slate-300 transform transition-transform duration-300 flex flex-col ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } md:relative md:translate-x-0 border-r border-slate-800`}>
        
        <div className="p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white">O</div>
            <span className="font-bold text-white text-lg tracking-tight">OmniMind</span>
          </div>
          <button onClick={onToggle} className="md:hidden text-slate-400 hover:text-white">
            <ChevronLeft size={20} />
          </button>
        </div>

        <div className="p-4">
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-900/20"
          >
            <PlusCircle size={18} />
            <span>New Chat</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 mt-4">History</p>
          {sessions.length === 0 ? (
            <div className="px-3 py-4 text-sm text-slate-600 italic">No chat history yet...</div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`group flex items-center justify-between rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${
                  currentSessionId === session.id 
                    ? 'bg-slate-800 text-white' 
                    : 'hover:bg-slate-800/50 hover:text-white text-slate-400'
                }`}
                onClick={() => onSelectSession(session.id)}
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <MessageSquare size={16} className="flex-shrink-0" />
                  <span className="text-sm truncate">{session.title}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-slate-800 space-y-4">
          <div className="flex items-center space-x-3 px-3 text-sm hover:text-white cursor-pointer transition-colors">
            <Settings size={18} />
            <span>Settings</span>
          </div>
          <a 
            href="https://github.com" 
            target="_blank" 
            className="flex items-center space-x-3 px-3 text-sm hover:text-white cursor-pointer transition-colors"
          >
            <Github size={18} />
            <span>Documentation</span>
          </a>
          <div className="pt-2 px-3">
             <div className="flex items-center space-x-3 bg-slate-800/50 p-3 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">U</div>
                <div className="flex flex-col overflow-hidden">
                   <span className="text-xs font-semibold text-white truncate">Standard Plan</span>
                   <span className="text-[10px] text-slate-500">Gemini 3 Pro Enabled</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
