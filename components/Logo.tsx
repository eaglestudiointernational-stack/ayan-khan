
import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => (
  <div className={`${className} relative flex items-center justify-center`}>
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#9333ea" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="45" fill="none" stroke="url(#logoGrad)" strokeWidth="8" strokeDasharray="200" className="animate-[spin_10s_linear_infinite]" />
      <path d="M30 50 Q50 20 70 50 T30 50" fill="url(#logoGrad)" className="animate-pulse">
        <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="20s" repeatCount="indefinite" />
      </path>
      <circle cx="50" cy="50" r="10" fill="white" />
    </svg>
  </div>
);

export default Logo;
