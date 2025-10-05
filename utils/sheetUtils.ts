import { SheetData } from '../types.ts';

export const getColumnName = (colIndex: number): string => {
  let name = '';
  let dividend = colIndex + 1;
  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    name = String.fromCharCode(65 + modulo) + name;
    dividend = Math.floor((dividend - modulo) / 26);
  }
  return name;
};

export const getCellLabel = (row: number, col: number): string => {
  return `${getColumnName(col)}${row + 1}`;
};

export const cellRefToCoords = (ref: string): { row: number, col: number } | null => {
    const match = ref.toUpperCase().match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;

    const [, colStr, rowStr] = match;
    const row = parseInt(rowStr, 10) - 1;

    let col = 0;
    for (let i = 0; i < colStr.length; i++) {
        col = col * 26 + (colStr.charCodeAt(i) - 65);
    }

    return { row, col };
};

export const a1RangeToObjects = (a1Range: string): { startRow: number, startCol: number, endRow: number, endCol: number } => {
    const [start, end] = a1Range.split(':');
    const startCoords = cellRefToCoords(start);
    const endCoords = cellRefToCoords(end || start);
    
    if (!startCoords || !endCoords) {
        return { startRow: 0, startCol: 0, endRow: 0, endCol: 0 };
    }

    return { 
        startRow: Math.min(startCoords.row, endCoords.row),
        startCol: Math.min(startCoords.col, endCoords.col),
        endRow: Math.max(startCoords.row, endCoords.row),
        endCol: Math.max(startCoords.col, endCoords.col),
    };
};

export const sheetDataToCsv = (data: (any | undefined)[][]): string => {
    // Find the actual bounds of the data
    let maxRow = 0;
    let maxCol = 0;
    data.forEach((row, r) => {
        if(row) {
            row.forEach((cell, c) => {
                if (cell && cell.value) {
                    maxRow = Math.max(maxRow, r);
                    maxCol = Math.max(maxCol, c);
                }
            });
        }
    });

    const csvRows: string[] = [];

    for (let i = 0; i <= maxRow; i++) {
        const row = data[i] || [];
        const csvCols: string[] = [];
        for (let j = 0; j <= maxCol; j++) {
            const cellValue = row[j]?.value || '';
            
            // Handle quotes and commas
            let escapedValue = cellValue.replace(/"/g, '""');
            if (escapedValue.includes(',') || escapedValue.includes('\n') || escapedValue.includes('"')) {
                escapedValue = `"${escapedValue}"`;
            }
            csvCols.push(escapedValue);
        }
        csvRows.push(csvCols.join(','));
    }

    return csvRows.join('\n');
};

export const findContiguousRange = (startRow: number, startCol: number, data: SheetData): { startRow: number, endRow: number, startCol: number, endCol: number } | null => {
    const rowCount = data.length;
    if (rowCount === 0) return null;
    const colCount = data[0]?.length || 0;

    const isEmpty = (r: number, c: number) => !data[r]?.[c]?.value;

    if (isEmpty(startRow, startCol)) return null;

    const queue: [number, number][] = [[startRow, startCol]];
    const visited = new Set<string>([`${startRow},${startCol}`]);
    let minR = startRow, maxR = startRow, minC = startCol, maxC = startCol;

    while (queue.length > 0) {
        const [r, c] = queue.shift()!;

        minR = Math.min(minR, r);
        maxR = Math.max(maxR, r);
        minC = Math.min(minC, c);
        maxC = Math.max(maxC, c);
        
        // Explore neighbors
        const neighbors: [number, number][] = [
            [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]
        ];

        for (const [nr, nc] of neighbors) {
            const key = `${nr},${nc}`;
            if (nr >= 0 && nr < rowCount && nc >= 0 && nc < colCount && !visited.has(key) && !isEmpty(nr, nc)) {
                visited.add(key);
                queue.push([nr, nc]);
            }
        }
    }

    return { startRow: minR, endRow: maxR, startCol: minC, endCol: maxC };
};