import React from 'react';

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-[#0D1117] flex flex-col items-center justify-center z-[200] select-none">
      <style>{`
          @keyframes fade-out-splash {
              from { opacity: 1; }
              to { opacity: 0; pointer-events: none; }
          }
          .animate-splash-container {
              animation: fade-out-splash 0.5s ease-out 3.3s forwards;
          }
          
          .plexus-svg {
              width: 150px;
              height: 150px;
          }
          
          .plexus-svg circle {
              fill: var(--color-accent-primary);
              animation: pulse 2s infinite ease-in-out;
          }
          
          .plexus-svg line {
              stroke: var(--color-accent-primary-hover);
              stroke-width: 1;
              animation: draw-line 3s infinite ease-in-out;
          }

          .plexus-svg .line-2 { animation-delay: -0.5s; }
          .plexus-svg .line-3 { animation-delay: -1s; }
          .plexus-svg .line-4 { animation-delay: -1.5s; }
          .plexus-svg .line-5 { animation-delay: -2s; }
          .plexus-svg .line-6 { animation-delay: -2.5s; }

          @keyframes pulse {
              0%, 100% { r: 3; opacity: 1; }
              50% { r: 5; opacity: 0.7; }
          }

          @keyframes draw-line {
              0%, 100% { stroke-dasharray: 0, 1000; }
              50% { stroke-dasharray: 1000, 1000; }
          }
          
          @keyframes fade-in-text {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .splash-text {
            opacity: 0;
            animation: fade-in-text 1s ease-out 2s forwards;
          }
      `}</style>
      <div className="animate-splash-container pointer-events-none text-center">
         <svg className="plexus-svg mx-auto" viewBox="0 0 100 100">
            <circle cx="50" cy="10" r="3" />
            <circle cx="20" cy="30" r="3" />
            <circle cx="80" cy="40" r="3" />
            <circle cx="30" cy="70" r="3" />
            <circle cx="70" cy="80" r="3" />
            <circle cx="50" cy="50" r="4" />
            
            <line className="line-1" x1="50" y1="10" x2="20" y2="30" />
            <line className="line-2" x1="50" y1="10" x2="80" y2="40" />
            <line className="line-3" x1="20" y1="30" x2="30" y2="70" />
            <line className="line-4" x1="80" y1="40" x2="70" y2="80" />
            <line className="line-5" x1="30" y1="70" x2="70" y2="80" />
            <line className="line-6" x1="50" y1="50" x2="50" y2="10" />
            <line className="line-1" x1="50" y1="50" x2="20" y2="30" />
            <line className="line-2" x1="50" y1="50" x2="80" y2="40" />
            <line className="line-3" x1="50" y1="50" x2="30" y2="70" />
            <line className="line-4" x1="50" y1="50" x2="70" y2="80" />
        </svg>
        <p className="mt-6 text-3xl font-semibold tracking-wider text-slate-300 text-center font-title splash-text">
          EterX Sheets
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;
