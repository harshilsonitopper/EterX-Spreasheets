import React, { useRef, useEffect } from 'react';

const PALETTE = {
  "Pastel Dream": ['#E8A0BF', '#A0BFE8', '#B9F2D3', '#FDEEBF', '#BDB2FF'],
  "Vibrant Glass": ['#ff00a0', '#00f5d4', '#ff8c00', '#58A6FF', '#F778BA'],
  "Nordic Tones": ['#bf616a', '#d08770', '#ebcb8b', '#a3be8c', '#b48ead'],
  "Frost & Aurora": ['#8fbcbb', '#88c0d0', '#81a1c1', '#5e81ac', '#d8dee9'],
};

interface ColorPickerProps {
  onClose: () => void;
  onSelectColor: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ onClose, onSelectColor }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-2 bg-bg-secondary/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-lg z-50 p-3 w-48"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-text-primary">Fill Color</span>
        <button
          onClick={() => onSelectColor('transparent')}
          className="w-6 h-6 rounded-md transition transform hover:scale-110 bg-transparent border border-dashed border-border-primary relative"
          title="Clear color"
        >
          <div className="absolute top-1/2 left-0 w-full h-px bg-red-500 transform -rotate-45"></div>
        </button>
      </div>
      <div className="space-y-3">
        {Object.entries(PALETTE).map(([name, colors]) => (
          <div key={name}>
            <p className="text-xs text-text-muted mb-1.5 px-1">{name}</p>
            <div className="grid grid-cols-5 gap-1.5">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => onSelectColor(color)}
                  className="w-6 h-6 rounded-lg transition transform hover:scale-110 border border-black/10"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ColorPicker;