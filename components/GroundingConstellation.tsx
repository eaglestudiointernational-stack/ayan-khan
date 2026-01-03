
import React, { useState } from 'react';
import { GroundingNode } from '../types';
import { ExternalLink, Sparkles } from 'lucide-react';

interface GroundingConstellationProps {
  nodes: GroundingNode[];
}

const GroundingConstellation: React.FC<GroundingConstellationProps> = ({ nodes }) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  if (!nodes || nodes.length === 0) return null;

  return (
    <div className="mt-6 mb-4 p-4 bg-[#0a0c14] rounded-3xl border border-white/10 overflow-hidden relative group/nebula">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center space-x-2">
          <Sparkles size={14} className="text-indigo-400 animate-pulse" />
          <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Grounding Constellation</span>
        </div>
        <span className="text-[9px] text-slate-500 font-bold uppercase">{nodes.length} Verifiable Sources</span>
      </div>

      <div className="relative h-48 w-full bg-gradient-to-b from-transparent to-indigo-950/20 rounded-2xl border border-white/5 overflow-hidden">
        {/* Connection Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
          {nodes.map((node, i) => {
            const next = nodes[(i + 1) % nodes.length];
            return (
              <line
                key={`line-${i}`}
                x1={`${node.x}%`}
                y1={`${node.y}%`}
                x2={`${next.x}%`}
                y2={`${next.y}%`}
                stroke="white"
                strokeWidth="0.5"
                strokeDasharray="4 4"
                className="animate-[dash_20s_linear_infinite]"
              />
            );
          })}
        </svg>

        {/* Source Stars */}
        {nodes.map((node) => (
          <div
            key={node.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 group/star"
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            onMouseEnter={() => setHoveredNode(node.id)}
            onMouseLeave={() => setHoveredNode(null)}
          >
            <a 
              href={node.uri} 
              target="_blank" 
              rel="noopener noreferrer"
              className={`block w-3 h-3 rounded-full transition-all duration-500 ${
                hoveredNode === node.id ? 'bg-white scale-150 shadow-[0_0_15px_#fff]' : 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]'
              }`}
            />
            
            {/* Tooltip */}
            <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 bg-white p-3 rounded-xl shadow-2xl transition-all duration-300 pointer-events-none z-10 ${
              hoveredNode === node.id ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95'
            }`}>
              <div className="text-[10px] font-black text-indigo-600 uppercase mb-1 flex items-center justify-between">
                <span>Verified Source</span>
                <ExternalLink size={10} />
              </div>
              <p className="text-[11px] font-bold text-slate-800 line-clamp-2 leading-tight">{node.title}</p>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45" />
            </div>
          </div>
        ))}

        {/* Background Particles */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div 
              key={i} 
              className="absolute w-0.5 h-0.5 bg-white/20 rounded-full animate-pulse" 
              style={{ left: `${Math.random()*100}%`, top: `${Math.random()*100}%`, animationDelay: `${Math.random()*2}s` }}
            />
          ))}
        </div>
      </div>
      
      <p className="mt-3 text-[9px] text-slate-500 text-center font-bold tracking-wider">HOVER OVER STARS TO EXPLORE KNOWLEDGE NODES</p>
    </div>
  );
};

export default GroundingConstellation;
