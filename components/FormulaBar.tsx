import React, { useState, useEffect } from 'react';
import { SparklesIcon } from './icons.tsx';

interface FormulaBarProps {
  cellValue: string;
  onCellValueChange: (value: string) => void;
  onCommit: () => void;
  selectedCellLabel: string;
  availableFunctions: string[];
}

const FormulaBar: React.FC<FormulaBarProps> = ({ cellValue, onCellValueChange, onCommit, selectedCellLabel, availableFunctions }) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (cellValue.startsWith('=')) {
      const formulaText = cellValue.substring(1).toUpperCase();
      if (formulaText.length > 0) {
        setSuggestions(availableFunctions.filter(fn => fn.startsWith(formulaText)));
      } else {
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  }, [cellValue, availableFunctions]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onCommit();
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setSuggestions([]);
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleSuggestionClick = (funcName: string) => {
    onCellValueChange(`=${funcName}(`);
    setSuggestions([]);
  };
  
  return (
    <div className="h-8 flex items-center px-2 text-sm flex-shrink-0 relative">
      <div className="w-24 text-center border-r border-border-primary pr-2 text-text-muted font-mono">{selectedCellLabel}</div>
      <div className="flex items-center flex-grow pl-2">
        <span className="italic text-text-muted pr-2">fx</span>
        <input
          type="text"
          value={cellValue}
          onChange={(e) => onCellValueChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { onCommit(); setIsFocused(false); }}
          onFocus={() => setIsFocused(true)}
          className="flex-grow bg-transparent focus:outline-none px-2 text-text-primary font-mono"
          placeholder={cellValue.startsWith('=') ? "" : "Enter a value or formula"}
        />
      </div>
      {isFocused && suggestions.length > 0 && (
        <div className="absolute top-full left-28 mt-1 bg-bg-secondary/80 backdrop-blur-xl border border-white/10 rounded-lg shadow-lg z-50 w-64 max-h-48 overflow-y-auto">
          {suggestions.map(func => (
            <div 
              key={func}
              onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(func); }}
              className="p-2 hover:bg-bg-tertiary/70 cursor-pointer text-text-primary font-mono text-xs"
            >
              {func}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FormulaBar;