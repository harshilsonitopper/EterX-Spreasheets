import React from 'react';

interface CreativeCommentProps {
  text: string;
  targetRect: DOMRect;
}

const CreativeComment: React.FC<CreativeCommentProps> = ({ text, targetRect }) => {
  const top = targetRect.top - 10;
  const left = targetRect.right + 15;

  return (
    <div
      className="fixed top-0 left-0 z-[100] p-3 bg-bg-tertiary/90 backdrop-blur-md text-text-primary text-xs rounded-lg shadow-2xl max-w-xs animate-fade-in-fast"
      style={{
        transform: `translate(${left}px, ${top}px)`,
        pointerEvents: 'none'
      }}
    >
      <style>{`
        @keyframes fade-in-fast {
          from { opacity: 0; transform: translate(${left}px, ${top + 5}px) scale(0.95); }
          to { opacity: 1; transform: translate(${left}px, ${top}px) scale(1); }
        }
        .animate-fade-in-fast {
          animation: fade-in-fast 0.2s ease-out forwards;
        }
        .comment-arrow {
          position: absolute;
          top: 8px; 
          right: 100%;
          width: 20px;
          height: 15px;
          overflow: hidden;
        }
        .comment-arrow::before {
          content: '';
          position: absolute;
          width: 15px;
          height: 15px;
          background: transparent;
          border-radius: 50%;
          box-shadow: -7px 7px 0 6px var(--color-bg-tertiary);
          transform: translateY(-50%);
          top: -2px;
          left: 13px;
        }
      `}</style>
      <div className="comment-arrow"></div>
      {text}
    </div>
  );
};

export default CreativeComment;
