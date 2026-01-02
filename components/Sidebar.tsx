
import React from 'react';
import { PlusCircle, MessageSquare, Trash2, Github, Settings, ChevronLeft, CreditCard } from 'lucide-react';
import { ChatSession } from '../types';
import Logo from './Logo';

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
      {isOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden transition-all duration-300" onClick={onToggle} />}
      
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0a0c14] text-slate-300 transform transition-transform duration-500 ease-in-out flex flex-col ${
        isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      } md:relative md:translate-x-0 border-r border-slate-800/50`}>
        
        <div className="p-6 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center space-x-3">
            <Logo className="w-9 h-9" />
            <span className="font-black text-white text-xl tracking-tighter italic">OMNIMIND</span>
          </div>
          <button onClick={onToggle} className="md:hidden text-slate-500 hover:text-white transition-colors p-1">
            <ChevronLeft size={24} />
          </button>
        </div>

        <div className="p-5">
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-xl shadow-indigo-950/40 active:scale-95 group"
          >
            <PlusCircle size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            <span>New Generation</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-1.5 scrollbar-hide">
          <p className="px-3 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3 mt-6">ARCHIVE</p>
          {sessions.length === 0 ? (
            <div className="px-4 py-8 text-xs text-slate-700 font-medium italic text-center">No active pulses...</div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`group flex items-center justify-between rounded-xl px-4 py-3 cursor-pointer transition-all duration-300 ${
                  currentSessionId === session.id 
                    ? 'bg-white/5 text-white ring-1 ring-white/10' 
                    : 'hover:bg-white/[0.03] text-slate-500 hover:text-slate-300'
                }`}
                onClick={() => onSelectSession(session.id)}
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <MessageSquare size={16} className={`flex-shrink-0 ${currentSessionId === session.id ? 'text-indigo-500' : ''}`} />
                  <span className="text-xs font-bold truncate tracking-tight">{session.title}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-5 border-t border-white/5 space-y-5 bg-[#07090f]">
          <div className="space-y-2">
            <div className="flex items-center justify-between px-3 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
              <span>Cloud Storage</span>
              <span>12%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full w-[12%] bg-indigo-600 rounded-full" />
            </div>
          </div>

          <div className="flex flex-col space-y-1">
             <button className="flex items-center space-x-3 px-3 py-2 text-xs font-bold hover:text-white hover:bg-white/5 rounded-xl transition-all">
                <Settings size={18} className="text-slate-500" />
                <span>System Config</span>
             </button>
             <button className="flex items-center space-x-3 px-3 py-2 text-xs font-bold text-indigo-400 hover:bg-indigo-400/5 rounded-xl transition-all">
                <CreditCard size={18} />
                <span>Upgrade License</span>
             </button>
          </div>
          
          <div className="pt-2">
             <div className="flex items-center space-x-3 bg-white/[0.03] p-3 rounded-2xl border border-white/5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-xs font-black text-white shadow-inner">MA</div>
                <div className="flex flex-col overflow-hidden">
                   <span className="text-xs font-black text-white truncate">Muhammad Ayan</span>
                   <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Enterprise Dev</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
