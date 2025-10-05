import React from 'react';
import AiPanel from './AiPanel.tsx';
import { AnalysisItem } from '../types.ts';
import { NewChatIcon, SettingsIcon, ChevronRightIcon, XIcon } from './icons.tsx';

interface RightSidebarProps {
  analysisHistory: AnalysisItem[];
  onSuggestionClick: (suggestion: string) => void;
  onNewChat: () => void;
  isAiLoading: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

const RightSidebar: React.FC<RightSidebarProps> = ({ analysisHistory, onSuggestionClick, onNewChat, isAiLoading, isOpen, onToggle }) => {
  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          onClick={onToggle} 
          className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 md:hidden"
        ></div>
      )}

      <aside className={`
        fixed md:relative inset-y-0 right-0 z-50 md:z-auto
        bg-bg-secondary/80 backdrop-blur-xl border-l border-white/10
        flex flex-col flex-shrink-0 
        transition-all duration-300 ease-in-out
        w-full max-w-sm
        ${isOpen ? 'translate-x-0 md:w-96' : 'translate-x-full md:translate-x-0 md:w-0'}
      `} style={{borderRadius: 'var(--radius-lg) 0 0 var(--radius-lg)'}}>
        <div className={`flex flex-col w-full h-full md:w-96 overflow-hidden`}>
          <header className="h-10 border-b border-white/10 flex items-center justify-between px-4 flex-shrink-0">
            <h2 className="font-semibold text-text-primary text-sm">AI Assistant</h2>
            <div className="flex items-center gap-2">
                <button onClick={onNewChat} className="p-1.5 rounded text-text-muted hover:bg-bg-tertiary/70 hover:text-text-primary" title="New Chat">
                    <NewChatIcon className="w-4 h-4" />
                </button>
                <button onClick={onToggle} className="p-1.5 rounded text-text-muted hover:bg-bg-tertiary/70 hover:text-text-primary md:hidden" title="Close">
                    <XIcon className="w-4 h-4" />
                </button>
            </div>
          </header>
          <div className={`flex-grow p-4 overflow-y-auto`}>
            <AiPanel 
              analysisHistory={analysisHistory} 
              onSuggestionClick={onSuggestionClick}
              isAiLoading={isAiLoading}
            />
          </div>
        </div>
      </aside>

      {/* Desktop Toggle Button */}
      <button
        onClick={onToggle}
        title={isOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
        className={`
          hidden md:block
          absolute top-2.5 p-1.5 rounded-full bg-bg-secondary/50 backdrop-blur-sm text-text-primary 
          shadow-lg hover:bg-bg-tertiary/70 focus:outline-none focus:ring-2 focus:ring-accent-primary 
          transition-all duration-300 ease-in-out z-20 
          ${isOpen ? 'right-[24.5rem]' : 'right-3'}
        `}
      >
        <ChevronRightIcon className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
    </>
  );
};

export default RightSidebar;