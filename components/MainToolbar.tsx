import React, { useState } from 'react';
import { BoldIcon, ItalicIcon, UnderlineIcon, PaletteIcon, GridIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon, EterXLogoIcon } from './icons.tsx';
import { CellStyle } from '../types.ts';
import ColorPicker from './ColorPicker.tsx';
import { vibrate } from '../utils/haptics.ts';

interface MainToolbarProps {
  onStyleApply: (style: Partial<CellStyle>) => void;
}

const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => {
    const [visible, setVisible] = useState(false);
    return (
        <div className="relative flex items-center" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
            {children}
            <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-bg-primary/80 backdrop-blur-md shadow-lg rounded-full text-xs font-semibold text-text-primary whitespace-nowrap z-50 transition-all duration-200 pointer-events-none flex items-center gap-1.5 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
                 <EterXLogoIcon className="w-3.5 h-3.5" />
                <span>{text}</span>
            </div>
        </div>
    );
};

const MainToolbar: React.FC<MainToolbarProps> = ({ onStyleApply }) => {
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleStyleApply = (style: Partial<CellStyle>) => {
    vibrate(20);
    onStyleApply(style);
  };

  return (
    <div className="h-10 bg-transparent hidden md:flex items-center justify-between px-3 flex-shrink-0">
      <div className="flex items-center gap-1">
        <Tooltip text="Bold (Ctrl+B)">
            <button
              onClick={() => handleStyleApply({ fontWeight: 'bold' })}
              className="p-2 rounded-lg hover:bg-bg-tertiary/70 text-text-secondary transition-colors"
            >
              <BoldIcon />
            </button>
        </Tooltip>
        <Tooltip text="Italic (Ctrl+I)">
            <button
              onClick={() => handleStyleApply({ fontStyle: 'italic' })}
              className="p-2 rounded-lg hover:bg-bg-tertiary/70 text-text-secondary transition-colors"
            >
              <ItalicIcon />
            </button>
        </Tooltip>
        <Tooltip text="Underline (Ctrl+U)">
            <button
              onClick={() => handleStyleApply({ textDecoration: 'underline' })}
              className="p-2 rounded-lg hover:bg-bg-tertiary/70 text-text-secondary transition-colors"
            >
              <UnderlineIcon />
            </button>
        </Tooltip>
        <div className="w-px h-6 bg-border-primary mx-2"></div>
        <div className="relative">
          <Tooltip text="Fill Color">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-2 rounded-lg hover:bg-bg-tertiary/70 text-text-secondary transition-colors"
            >
              <PaletteIcon />
            </button>
          </Tooltip>
            {showColorPicker && (
                <ColorPicker 
                    onClose={() => setShowColorPicker(false)}
                    onSelectColor={(color) => {
                        handleStyleApply({ backgroundColor: color });
                        setShowColorPicker(false);
                    }}
                />
            )}
        </div>
         <div className="w-px h-6 bg-border-primary mx-2"></div>
         <Tooltip text="Align Left">
            <button
              onClick={() => handleStyleApply({ textAlign: 'left' })}
              className="p-2 rounded-lg hover:bg-bg-tertiary/70 text-text-secondary transition-colors"
            >
              <AlignLeftIcon />
            </button>
        </Tooltip>
         <Tooltip text="Align Center">
            <button
              onClick={() => handleStyleApply({ textAlign: 'center' })}
              className="p-2 rounded-lg hover:bg-bg-tertiary/70 text-text-secondary transition-colors"
            >
              <AlignCenterIcon />
            </button>
        </Tooltip>
        <Tooltip text="Align Right">
            <button
              onClick={() => handleStyleApply({ textAlign: 'right' })}
              className="p-2 rounded-lg hover:bg-bg-tertiary/70 text-text-secondary transition-colors"
            >
              <AlignRightIcon />
            </button>
        </Tooltip>
      </div>
    </div>
  );
};

export default MainToolbar;