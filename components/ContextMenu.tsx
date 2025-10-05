import React, { useEffect, useRef } from 'react';

// FIX: Expanded the `ContextMenuAction` type to include style and sort actions.
export type ContextMenuAction = 
  | 'cut' | 'copy' | 'paste' 
  | 'insert_row_above' | 'insert_row_below' | 'delete_row' 
  | 'insert_col_left' | 'insert_col_right' | 'delete_col' 
  | 'clear_content'
  | 'style_bold' | 'style_italic' | 'style_underline'
  | 'style_align_left' | 'style_align_center' | 'style_align_right'
  | 'sort_asc' | 'sort_desc';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onAction: (action: ContextMenuAction) => void;
  selection: { startRow: number, endRow: number, startCol: number, endCol: number };
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, onAction, selection }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const rowCount = selection.endRow - selection.startRow + 1;
  const colCount = selection.endCol - selection.startCol + 1;

  const handleAction = (action: ContextMenuAction) => {
    onAction(action);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={{ top: y, left: x }}
      className="fixed z-50 bg-bg-tertiary/80 backdrop-blur-lg border border-border-primary/50 rounded-md shadow-2xl w-56 text-sm text-text-secondary animate-fade-in"
    >
        <style>{`
            @keyframes fade-in {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }
            .animate-fade-in {
                animation: fade-in 0.1s ease-out forwards;
            }
        `}</style>
      <ul className="p-2">
        <li className="px-3 py-1.5 hover:bg-bg-secondary/70 rounded cursor-pointer" onClick={() => handleAction('cut')}>Cut</li>
        <li className="px-3 py-1.5 hover:bg-bg-secondary/70 rounded cursor-pointer" onClick={() => handleAction('copy')}>Copy</li>
        <li className="px-3 py-1.5 hover:bg-bg-secondary/70 rounded cursor-pointer" onClick={() => handleAction('paste')}>Paste</li>
        <div className="h-px bg-border-primary/50 my-2"></div>
        <li className="px-3 py-1.5 hover:bg-bg-secondary/70 rounded cursor-pointer" onClick={() => handleAction('insert_row_above')}>Insert {rowCount} row{rowCount > 1 ? 's' : ''} above</li>
        <li className="px-3 py-1.5 hover:bg-bg-secondary/70 rounded cursor-pointer" onClick={() => handleAction('insert_row_below')}>Insert {rowCount} row{rowCount > 1 ? 's' : ''} below</li>
        <li className="px-3 py-1.5 hover:bg-bg-secondary/70 rounded cursor-pointer" onClick={() => handleAction('delete_row')}>Delete row{rowCount > 1 ? 's' : ''} {selection.startRow + 1} - {selection.endRow + 1}</li>
        <div className="h-px bg-border-primary/50 my-2"></div>
        <li className="px-3 py-1.5 hover:bg-bg-secondary/70 rounded cursor-pointer" onClick={() => handleAction('insert_col_left')}>Insert {colCount} col{colCount > 1 ? 's' : ''} left</li>
        <li className="px-3 py-1.5 hover:bg-bg-secondary/70 rounded cursor-pointer" onClick={() => handleAction('insert_col_right')}>Insert {colCount} col{colCount > 1 ? 's' : ''} right</li>
        <li className="px-3 py-1.5 hover:bg-bg-secondary/70 rounded cursor-pointer" onClick={() => handleAction('delete_col')}>Delete column{colCount > 1 ? 's' : ''}</li>
        <div className="h-px bg-border-primary/50 my-2"></div>
        <li className="px-3 py-1.5 hover:bg-bg-secondary/70 rounded cursor-pointer" onClick={() => handleAction('clear_content')}>Clear content</li>
      </ul>
    </div>
  );
};

export default ContextMenu;