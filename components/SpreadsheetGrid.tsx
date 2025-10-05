import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { SheetData } from '../types.ts';
import { getColumnName, getCellLabel } from '../utils/sheetUtils.ts';
import ContextMenu, { ContextMenuAction } from './ContextMenu.tsx';
import { getContrastingTextColor } from '../utils/colorUtils.ts';
import CreativeComment from './CreativeComment.tsx';
import PredictiveFillButton from './PredictiveFillButton.tsx';
import SmartFormatButton from './SmartFormatButton.tsx';


const BASE_CELL_HEIGHT = 28;
const BASE_CELL_WIDTH = 120;
const BASE_ROW_HEADER_WIDTH = 50;
const BASE_COL_HEADER_HEIGHT = 30;

interface SpreadsheetGridProps {
  sheetData: SheetData;
  comments: { [key: string]: string };
  zoomLevel: number;
  onCellUpdate: (row: number, col: number, value: string) => void;
  onContextMenuAction: (action: ContextMenuAction, selection: any) => void;
  selection: { startRow: number, startCol: number, endRow: number, endCol: number };
  onSelectionChange: (selection: { startRow: number, startCol: number, endRow: number, endCol: number }) => void;
  onSmartSelect: (row: number, col: number) => void;
  onSmartFormat: () => void;
  activeCell: { row: number, col: number };
  onActiveCellChange: (cell: { row: number, col: number }) => void;
  predictiveFill: { col: number; suggestions: { row: number; value: string }[] } | null;
  onAcceptPredictiveFill: () => void;
  onClearPredictiveFill: () => void;
}

const SpreadsheetGrid: React.FC<SpreadsheetGridProps> = ({
  sheetData, comments, zoomLevel, onCellUpdate, onContextMenuAction,
  selection, onSelectionChange, onSmartSelect, onSmartFormat, activeCell, onActiveCellChange,
  predictiveFill, onAcceptPredictiveFill, onClearPredictiveFill
}) => {
  const [editingCell, setEditingCell] = useState<{ row: number, col: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);
  const [hoveredComment, setHoveredComment] = useState<{ cellRef: string; rect: DOMRect } | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const activeCellRef = useRef<HTMLTableCellElement>(null);
  const selectionRef = useRef<HTMLDivElement>(null);


  const rowCount = sheetData.length;
  const colCount = sheetData[0]?.length || 0;
  
  const zoom = zoomLevel / 100;
  const CELL_HEIGHT = BASE_CELL_HEIGHT * zoom;
  const CELL_WIDTH = BASE_CELL_WIDTH * zoom;
  const ROW_HEADER_WIDTH = BASE_ROW_HEADER_WIDTH * zoom;
  const COL_HEADER_HEIGHT = BASE_COL_HEADER_HEIGHT * zoom;

  const handleCellMouseDown = (row: number, col: number, e: React.MouseEvent) => {
    e.preventDefault();
    if (editingCell?.row !== row || editingCell?.col !== col) setEditingCell(null);
    onClearPredictiveFill();
    onActiveCellChange({ row, col });
    onSelectionChange({ startRow: row, startCol: col, endRow: row, endCol: col });

    const handleMouseMove = (moveE: MouseEvent) => {
      const gridRect = gridContainerRef.current!.getBoundingClientRect();
      const newActiveCell = getCellFromCoords(moveE.clientX, moveE.clientY, gridRect);
      onSelectionChange({ ...selection, startRow: row, startCol: col, endRow: newActiveCell.row, endCol: newActiveCell.col });
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  const getCellFromCoords = (x: number, y: number, gridRect: DOMRect) => {
    const scrollLeft = gridContainerRef.current?.scrollLeft || 0;
    const scrollTop = gridContainerRef.current?.scrollTop || 0;

    const col = Math.floor((x - gridRect.left + scrollLeft - ROW_HEADER_WIDTH) / CELL_WIDTH);
    const row = Math.floor((y - gridRect.top + scrollTop - COL_HEADER_HEIGHT) / CELL_HEIGHT);
    
    return { row: Math.max(0, Math.min(rowCount-1, row)), col: Math.max(0, Math.min(colCount-1, col)) };
  }
  
  const handleCellDoubleClick = (row: number, col: number) => {
      onSmartSelect(row, col);
  };
  
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editingCell) onCellUpdate(editingCell.row, editingCell.col, e.target.value);
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (editingCell) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (predictiveFill) {
                onAcceptPredictiveFill();
            }
            setEditingCell(null);
            const nextRow = Math.min(activeCell.row + 1, rowCount-1);
            onActiveCellChange({ row: nextRow, col: activeCell.col });
            onSelectionChange({ startRow: nextRow, startCol: activeCell.col, endRow: nextRow, endCol: activeCell.col });
        } else if (e.key === 'Escape') {
            onClearPredictiveFill();
            setEditingCell(null);
        }
        return;
    }

    if (predictiveFill && (e.key === 'Enter' || e.key === 'Tab')) {
        e.preventDefault();
        onAcceptPredictiveFill();
        return;
    }
    if (predictiveFill && e.key === 'Escape') {
        onClearPredictiveFill();
        return;
    }


    let { row, col } = activeCell;
    let newSelection = { ...selection };
    
    switch(e.key) {
        case 'ArrowUp': row = Math.max(0, row - 1); e.preventDefault(); break;
        case 'ArrowDown': row = Math.min(rowCount - 1, row + 1); e.preventDefault(); break;
        case 'ArrowLeft': col = Math.max(0, col - 1); e.preventDefault(); break;
        case 'ArrowRight': col = Math.min(colCount - 1, col + 1); e.preventDefault(); break;
        case 'Tab': e.preventDefault(); col = e.shiftKey ? Math.max(0, col -1) : Math.min(colCount - 1, col + 1); break;
        case 'Enter':
            e.preventDefault();
            row = e.shiftKey ? Math.max(0, row - 1) : Math.min(rowCount - 1, row + 1);
            break;
        default:
            if (!e.ctrlKey && !e.metaKey && e.key.length === 1 && /^[a-zA-Z0-9!"#$%&'()*+,-./:;<=>?@[\\\]^_`{|}~ ]$/.test(e.key)) {
                onCellUpdate(row, col, '');
                setEditingCell({ row, col });
            }
            return;
    }
    
    onActiveCellChange({ row, col });

    if(e.shiftKey) {
        onSelectionChange({ ...selection, endRow: row, endCol: col });
    } else {
        onSelectionChange({ startRow: row, startCol: col, endRow: row, endCol: col });
    }
  }, [activeCell, editingCell, onActiveCellChange, onSelectionChange, onCellUpdate, rowCount, colCount, selection, predictiveFill, onAcceptPredictiveFill, onClearPredictiveFill]);
  
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };
  
  const normalizedSelection = {
    startRow: Math.min(selection.startRow, selection.endRow),
    endRow: Math.max(selection.startRow, selection.endRow),
    startCol: Math.min(selection.startCol, selection.endCol),
    endCol: Math.max(selection.startCol, selection.endCol),
  };

  useEffect(() => {
    if (activeCellRef.current && gridContainerRef.current) {
        const gridRect = gridContainerRef.current.getBoundingClientRect();
        const cellRect = activeCellRef.current.getBoundingClientRect();
        
        const scrollLeft = gridContainerRef.current.scrollLeft;
        const scrollTop = gridContainerRef.current.scrollTop;

        if (cellRect.right > gridRect.right) {
            gridContainerRef.current.scrollLeft = scrollLeft + (cellRect.right - gridRect.right);
        }
        if (cellRect.left < gridRect.left + ROW_HEADER_WIDTH) {
             gridContainerRef.current.scrollLeft = scrollLeft - (gridRect.left + ROW_HEADER_WIDTH - cellRect.left);
        }
        if (cellRect.bottom > gridRect.bottom) {
             gridContainerRef.current.scrollTop = scrollTop + (cellRect.bottom - gridRect.bottom);
        }
        if (cellRect.top < gridRect.top + COL_HEADER_HEIGHT) {
             gridContainerRef.current.scrollTop = scrollTop - (gridRect.top + COL_HEADER_HEIGHT - cellRect.top);
        }
    }
  }, [activeCell, CELL_WIDTH, CELL_HEIGHT, ROW_HEADER_WIDTH, COL_HEADER_HEIGHT]);

  return (
    <div 
        ref={gridContainerRef} 
        className="flex-grow overflow-auto bg-bg-primary/50 relative focus:outline-none"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        onContextMenu={handleContextMenu}
    >
        {predictiveFill && activeCellRef.current && (
             <PredictiveFillButton 
                targetRect={activeCellRef.current.getBoundingClientRect()}
                onAccept={onAcceptPredictiveFill}
                onDecline={onClearPredictiveFill}
             />
        )}
        {selectionRef.current && normalizedSelection.startRow !== normalizedSelection.endRow && (
            <SmartFormatButton
                targetRect={selectionRef.current.getBoundingClientRect()}
                onClick={onSmartFormat}
            />
        )}
        <table className="border-collapse table-fixed" style={{ fontSize: `${zoom * 14}px` }}>
            <thead className="sticky top-0 z-20">
                <tr>
                    <th className="sticky left-0 top-0 z-30 bg-bg-secondary/70 backdrop-blur-xl p-1 border-r border-b border-white/10 transition-colors" style={{ width: ROW_HEADER_WIDTH, minWidth: ROW_HEADER_WIDTH }}></th>
                    {Array.from({ length: colCount }).map((_, col) => (
                        <th key={col} className="bg-bg-secondary/70 backdrop-blur-xl p-1 border-r border-b border-white/10 text-text-muted font-medium transition-colors" style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH, height: COL_HEADER_HEIGHT }}>
                            {getColumnName(col)}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="relative">
                 {/* Selection Highlight */}
                 <div
                    ref={selectionRef}
                    className="absolute bg-accent-primary/20 border-2 border-accent-primary pointer-events-none z-10 rounded-sm"
                    style={{
                        left: normalizedSelection.startCol * CELL_WIDTH + ROW_HEADER_WIDTH,
                        top: normalizedSelection.startRow * CELL_HEIGHT + COL_HEADER_HEIGHT,
                        width: (normalizedSelection.endCol - normalizedSelection.startCol + 1) * CELL_WIDTH,
                        height: (normalizedSelection.endRow - normalizedSelection.startRow + 1) * CELL_HEIGHT
                    }}
                 />
                {Array.from({ length: rowCount }).map((_, rowIndex) => (
                    <tr key={rowIndex} style={{ height: CELL_HEIGHT }}>
                        <th className="sticky left-0 bg-bg-secondary/70 backdrop-blur-xl p-1 border-r border-b border-white/10 text-text-muted font-normal transition-colors" style={{width: ROW_HEADER_WIDTH, minWidth: ROW_HEADER_WIDTH}}>
                            {rowIndex + 1}
                        </th>
                        {Array.from({ length: colCount }).map((_, colIndex) => {
                            const cell = sheetData[rowIndex]?.[colIndex];
                            const prediction = predictiveFill?.col === colIndex ? predictiveFill.suggestions.find(s => s.row === rowIndex) : null;
                            const displayValue = cell?.displayValue || cell?.value || '';

                            let finalCellStyle = { ...cell?.style };

                            if (finalCellStyle.backgroundColor) {
                                finalCellStyle.color = getContrastingTextColor(finalCellStyle.backgroundColor as string);
                            }

                            const isPredicted = prediction && !displayValue;
                            if (isPredicted) {
                                finalCellStyle = {
                                    ...finalCellStyle,
                                    backgroundColor: 'rgba(9, 132, 227, 0.08)',
                                    boxShadow: 'inset 0 0 0 1px rgba(9, 132, 227, 0.4)',
                                };
                            }

                            const isActive = rowIndex === activeCell.row && colIndex === activeCell.col;
                            const cellLabel = getCellLabel(rowIndex, colIndex);
                            const hasComment = comments[cellLabel];

                            return (
                                <td
                                    key={colIndex}
                                    ref={isActive ? activeCellRef : null}
                                    onMouseDown={(e) => handleCellMouseDown(rowIndex, colIndex, e)}
                                    onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
                                    onMouseEnter={(e) => hasComment && setHoveredComment({ cellRef: cellLabel, rect: e.currentTarget.getBoundingClientRect() })}
                                    onMouseLeave={() => setHoveredComment(null)}
                                    className={`p-1 border-r border-b border-border-secondary/50 overflow-hidden whitespace-nowrap truncate relative box-border`}
                                    style={finalCellStyle}
                                >
                                    {editingCell?.row === rowIndex && editingCell?.col === colIndex ? (
                                       <input
                                         type="text"
                                         autoFocus
                                         value={sheetData[rowIndex]?.[colIndex]?.value || ''}
                                         onChange={handleEditChange}
                                         onBlur={() => setEditingCell(null)}
                                         className="absolute inset-0 w-full h-full bg-bg-primary outline-none p-1 m-0 border-2 border-accent-primary z-30"
                                         style={{ fontSize: `${zoom * 14}px` }}
                                       />
                                    ) : (
                                       <>
                                        {displayValue}
                                        {isPredicted && (
                                            <span className="text-text-muted italic opacity-80">{prediction.value}</span>
                                        )}
                                       </>
                                    )}
                                    {hasComment && (
                                        <div className="absolute top-0 right-0 border-t-[6px] border-l-[6px] border-t-accent-secondary border-l-transparent"></div>
                                    )}
                                </td>
                            );
                        })}
                    </tr>
                ))}
            </tbody>
        </table>

      {contextMenu && (
        <ContextMenu 
          x={contextMenu.x} y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onAction={(action) => onContextMenuAction(action, normalizedSelection)}
          selection={normalizedSelection}
        />
      )}
      {hoveredComment && ReactDOM.createPortal(
        <CreativeComment 
          text={comments[hoveredComment.cellRef]}
          targetRect={hoveredComment.rect}
        />,
        document.body
      )}
    </div>
  );
};

export default SpreadsheetGrid;