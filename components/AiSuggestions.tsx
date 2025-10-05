import React from 'react';

interface AiSuggestionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

const AiSuggestions: React.FC<AiSuggestionsProps> = ({ suggestions, onSelect }) => {
  if (suggestions.length === 0) {
    return null;
  }

  // This prevents the horizontal scrollbar from appearing when not needed.
  const suggestionContainerRef = React.useRef<HTMLDivElement>(null);
  
  return (
    <div className="px-3 pt-2">
        <div ref={suggestionContainerRef} className="flex items-center gap-2 overflow-x-auto pb-2 -mb-2">
          <span className="text-xs font-semibold text-text-muted mr-1 flex-shrink-0">Suggestions:</span>
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSelect(suggestion)}
              className="px-3 py-1 bg-bg-secondary hover:bg-bg-primary border border-border-secondary rounded-full text-xs text-text-secondary whitespace-nowrap transition-all duration-200 hover:-translate-y-0.5"
            >
              {suggestion}
            </button>
          ))}
        </div>
    </div>
  );
};

export default AiSuggestions;