import React from 'react';
import ReactDOM from 'react-dom';
import { CheckIcon, XIcon } from './icons.tsx';

interface PredictiveFillButtonProps {
  targetRect: DOMRect;
  onAccept: () => void;
  onDecline: () => void;
}

const PredictiveFillButton: React.FC<PredictiveFillButtonProps> = ({ targetRect, onAccept, onDecline }) => {
  const top = targetRect.bottom + 4;
  const left = targetRect.left;

  return ReactDOM.createPortal(
    <div
      className="fixed z-50 bg-bg-secondary/80 backdrop-blur-lg border border-border-primary/50 rounded-lg shadow-2xl flex items-center p-1 text-sm text-text-secondary animate-fade-in"
      style={{ top, left }}
    >
       <style>{`
            @keyframes fade-in {
                from { opacity: 0; transform: translateY(-5px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            .animate-fade-in {
                animation: fade-in 0.2s ease-out forwards;
            }
        `}</style>
      <span className="text-xs font-semibold px-2">AI Fill?</span>
      <button onClick={onAccept} className="p-1.5 rounded-md hover:bg-green-500/20 text-green-500 transition-colors">
        <CheckIcon className="w-4 h-4" />
      </button>
      <button onClick={onDecline} className="p-1.5 rounded-md hover:bg-red-500/20 text-red-500 transition-colors">
        <XIcon className="w-4 h-4" />
      </button>
    </div>,
    document.body
  );
};

export default PredictiveFillButton;