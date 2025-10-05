import React, { useState, useEffect } from 'react';
import { SheetData } from '../types.ts';

interface StatusBarProps {
    zoomLevel: number;
    onZoomChange: (zoom: number) => void;
    selection: { startRow: number, endRow: number, startCol: number, endCol: number };
    sheetData: SheetData;
}

const StatusBar: React.FC<StatusBarProps> = ({ zoomLevel, onZoomChange, selection, sheetData }) => {
    const [stats, setStats] = useState({ sum: 0, avg: 0, count: 0 });

    useEffect(() => {
        const { startRow, endRow, startCol, endCol } = selection;
        let sum = 0;
        let count = 0;
        
        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                const cell = sheetData[r]?.[c];
                if (cell && cell.value) {
                    const num = parseFloat(cell.value);
                    if (!isNaN(num)) {
                        sum += num;
                        count++;
                    }
                }
            }
        }
        
        setStats({
            sum,
            count,
            avg: count > 0 ? sum / count : 0,
        });

    }, [selection, sheetData]);
    
    return (
        <div className="h-6 bg-transparent flex items-center justify-between px-4 flex-shrink-0 text-xs text-text-muted">
             <div className="flex items-center gap-4">
                {stats.count > 1 && (
                  <>
                    <span title={`Average: ${stats.avg}`}>Avg: {stats.avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    <span title={`Count: ${stats.count}`}>Count: {stats.count.toLocaleString()}</span>
                    <span title={`Sum: ${stats.sum}`}>Sum: {stats.sum.toLocaleString()}</span>
                  </>
                )}
            </div>
            <div className="flex items-center gap-2">
                <span>Zoom:</span>
                <input 
                    type="range" 
                    min="50" 
                    max="200" 
                    step="10" 
                    value={zoomLevel} 
                    onChange={(e) => onZoomChange(parseInt(e.target.value, 10))}
                    className="w-24"
                />
                <span>{zoomLevel}%</span>
            </div>
        </div>
    );
};

export default StatusBar;