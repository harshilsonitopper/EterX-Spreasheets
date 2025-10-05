import React from 'react';
import { SparklesIcon } from './icons.tsx';
import { AnalysisItem } from '../types.ts';
import AiThinkingCard from './AiThinkingCard.tsx';
import AnalysisCard from './AnalysisCard.tsx';

interface AiPanelProps {
  analysisHistory: AnalysisItem[];
  onSuggestionClick: (suggestion: string) => void;
  isAiLoading: boolean;
}

const AiPanel: React.FC<AiPanelProps> = ({ analysisHistory, onSuggestionClick, isAiLoading }) => {
  const showWelcomeMessage = analysisHistory.length === 0 && !isAiLoading;

  return (
    <div className="space-y-6">
      {isAiLoading && <AiThinkingCard />}
      
      {analysisHistory.map((item) => (
        <AnalysisCard
          key={item.id}
          item={item}
          onSuggestionClick={onSuggestionClick}
        />
      )).reverse() /* Show latest first */}

      {showWelcomeMessage && (
         <div className="text-center text-sm text-text-muted pt-10">
            <SparklesIcon className="w-10 h-10 mx-auto mb-4" />
            <p className="font-semibold">Welcome to EterX AI Assistant</p>
            <p className="text-xs mt-2">Ask anything about your data, attach files, or use your voice.</p>
        </div>
      )}
    </div>
  );
};

export default AiPanel;
