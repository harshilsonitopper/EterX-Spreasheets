import React from 'react';
import ReactDOM from 'react-dom';
import { SparklesIcon } from './icons.tsx';

interface SmartFormatButtonProps {
  targetRect: DOMRect;
  onClick: () => void;
}

const SmartFormatButton: React.FC<SmartFormatButtonProps> = ({ targetRect, onClick }) => {
  const buttonSize = 44; // Approx. width + padding
  const screenPadding = 16;

  const rightPos = targetRect.right + 8;
  const leftPos = targetRect.left - buttonSize;

  let top = targetRect.top;
  // Position on the right unless it would go off-screen, then position on the left.
  let left = (rightPos + buttonSize > window.innerWidth - screenPadding) ? leftPos : rightPos;
  
  // Ensure it's not off-screen vertically or horizontally
  top = Math.max(screenPadding, Math.min(top, window.innerHeight - buttonSize - screenPadding));
  left = Math.max(screenPadding, left);


  return ReactDOM.createPortal(
    <button
      onClick={onClick}
      className="fixed z-50 bg-bg-secondary/80 backdrop-blur-lg border border-border-primary/50 rounded-full shadow-2xl flex items-center p-2 text-sm text-text-primary animate-fade-in-fast hover:bg-bg-tertiary transition-all hover:scale-105"
      style={{ top, left }}
      title="Smart Format Selection"
    >
       <style>{`
            @keyframes fade-in-fast {
                from { opacity: 0; transform: translateY(-5px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            .animate-fade-in-fast {
                animation: fade-in-fast 0.2s ease-out forwards;
            }
        `}</style>
      <SparklesIcon className="w-5 h-5 text-accent-primary" />
    </button>,
    document.body
  );
};

export default SmartFormatButton;
