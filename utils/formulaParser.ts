import { SheetData, CellData } from '../types.ts';
import { cellRefToCoords } from './sheetUtils.ts';

const getCellValue = (ref: string, sheetData: SheetData): number | string => {
    const coords = cellRefToCoords(ref);
    if (!coords) return 0;
    const cell = sheetData[coords.row]?.[coords.col];
    if (!cell || !cell.value) return 0;
    
    if (cell.value.startsWith('=')) {
        const evaluated = evaluateFormula(cell.value, sheetData);
        const evaluatedNum = parseFloat(evaluated.displayValue || '');
        return isNaN(evaluatedNum) ? (evaluated.displayValue || '') : evaluatedNum;
    }

    const num = parseFloat(cell.value);
    return isNaN(num) ? cell.value : num;
};

const getRangeValues = (range: string, sheetData: SheetData, numericOnly = true): (number | string)[] => {
    const [startRef, endRef] = range.split(':');
    const start = cellRefToCoords(startRef);
    const end = cellRefToCoords(endRef || startRef);
    if (!start || !end) return [];

    const values: (number | string)[] = [];
    for (let r = start.row; r <= end.row; r++) {
        for (let c = start.col; c <= end.col; c++) {
            const cell = sheetData[r]?.[c];
            if (cell && cell.value) {
                const val = getCellValue(`${String.fromCharCode(65 + c)}${r + 1}`, sheetData);
                if (numericOnly) {
                    if (typeof val === 'number') values.push(val);
                } else {
                    values.push(val);
                }
            } else {
                values.push('');
            }
        }
    }
    return values;
};

const getRangeValues2D = (range: string, sheetData: SheetData): (string | number)[][] => {
    const [startRef, endRef] = range.split(':');
    const start = cellRefToCoords(startRef);
    const end = cellRefToCoords(endRef || startRef);
    if (!start || !end) return [];

    const values: (string | number)[][] = [];
    for (let r = start.row; r <= end.row; r++) {
        const rowValues: (string | number)[] = [];
        for (let c = start.col; c <= end.col; c++) {
            const cellRef = `${String.fromCharCode(65 + c)}${r + 1}`;
            rowValues.push(getCellValue(cellRef, sheetData));
        }
        values.push(rowValues);
    }
    return values;
};

const resolveArgument = (arg: string, sheetData: SheetData): any => {
    arg = arg.trim();
    if (arg.includes(':')) { // It's a range
        return getRangeValues(arg, sheetData, false);
    }
    if (/^[A-Z]+\d+$/.test(arg)) { // It's a single cell
        return getCellValue(arg, sheetData);
    }
    if (arg.startsWith('"') && arg.endsWith('"')) { // It's a string literal
        return arg.slice(1, -1);
    }
    const num = parseFloat(arg);
    return isNaN(num) ? arg : num;
};

const evaluateCriterion = (value: any, criterion: string): boolean => {
    criterion = criterion.trim();
    if (criterion.startsWith('"') && criterion.endsWith('"')) {
        return String(value).toLowerCase() === criterion.slice(1, -1).toLowerCase();
    }

    const match = criterion.match(/^(>=|<=|<>|>|<|=)(.*)$/);
    if (match) {
        const operator = match[1];
        const critValue = parseFloat(match[2]);
        const numValue = parseFloat(value);
        if (isNaN(critValue) || isNaN(numValue)) return false;

        switch (operator) {
            case '>': return numValue > critValue;
            case '<': return numValue < critValue;
            case '>=': return numValue >= critValue;
            case '<=': return numValue <= critValue;
            case '=': return numValue === critValue;
            case '<>': return numValue !== critValue;
            default: return false;
        }
    }
    // Exact match for numbers or strings
    return String(value).toLowerCase() === criterion.toLowerCase();
};

const functions: { [key: string]: (args: string[], sheetData: SheetData) => string } = {
    SUM: (args, sheetData) => {
        const values = getRangeValues(args[0], sheetData) as number[];
        return String(values.reduce((a, b) => a + b, 0));
    },
    AVERAGE: (args, sheetData) => {
        const values = getRangeValues(args[0], sheetData) as number[];
        if (values.length === 0) return '#DIV/0!';
        return String(values.reduce((a, b) => a + b, 0) / values.length);
    },
    COUNT: (args, sheetData) => {
        const values = getRangeValues(args[0], sheetData, false);
        return String(values.filter(v => typeof v === 'number').length);
    },
    COUNTA: (args, sheetData) => {
        const values = getRangeValues(args[0], sheetData, false);
        return String(values.filter(v => v !== null && v !== undefined && v !== '').length);
    },
    MAX: (args, sheetData) => {
        const values = getRangeValues(args[0], sheetData) as number[];
        return values.length === 0 ? '0' : String(Math.max(...values));
    },
    MIN: (args, sheetData) => {
        const values = getRangeValues(args[0], sheetData) as number[];
        return values.length === 0 ? '0' : String(Math.min(...values));
    },
    CONCAT: (args, sheetData) => {
        return args.map(arg => resolveArgument(arg, sheetData)).flat().join('');
    },
    CONCATENATE: (args, sheetData) => functions.CONCAT(args, sheetData),
    LEN: (args, sheetData) => {
        const arg = resolveArgument(args[0], sheetData);
        return String(String(arg).length);
    },
    TRIM: (args, sheetData) => {
        const arg = resolveArgument(args[0], sheetData);
        return String(arg).trim();
    },
    LOWER: (args, sheetData) => {
        const arg = resolveArgument(args[0], sheetData);
        return String(arg).toLowerCase();
    },
    UPPER: (args, sheetData) => {
        const arg = resolveArgument(args[0], sheetData);
        return String(arg).toUpperCase();
    },
    PROPER: (args, sheetData) => {
        const arg = String(resolveArgument(args[0], sheetData));
        return arg.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    },
    ROUND: (args, sheetData) => {
        const num = parseFloat(String(resolveArgument(args[0], sheetData)));
        const places = args[1] ? parseInt(String(resolveArgument(args[1], sheetData)), 10) : 0;
        if (isNaN(num) || isNaN(places)) return '#VALUE!';
        const multiplier = Math.pow(10, places);
        return String(Math.round(num * multiplier) / multiplier);
    },
    IF: (args, sheetData) => {
        let [condition, trueVal, falseVal] = args;
        const resolveRefs = (str: string) => {
            if (!str) return '""';
            return str.replace(/[A-Z]+\d+/g, (match) => {
                const val = getCellValue(match, sheetData);
                return typeof val === 'string' ? `"${val}"` : String(val);
            });
        }
        
        let conditionResult = false;
        try {
            // A very basic and limited logical evaluator
            const resolvedCondition = resolveRefs(condition);
            conditionResult = new Function(`return ${resolvedCondition}`)();
        } catch {
            conditionResult = false;
        }

        const resultStr = (conditionResult ? trueVal : falseVal).trim();
        const resolvedResult = resolveArgument(resultStr, sheetData);
        return String(resolvedResult);
    },
    SUMIF: (args, sheetData) => {
        const [rangeStr, criterion, sumRangeStr] = args;
        const criteriaRange = getRangeValues2D(rangeStr, sheetData);
        const sumRange = sumRangeStr ? getRangeValues2D(sumRangeStr, sheetData) : criteriaRange;

        let total = 0;
        for (let i = 0; i < criteriaRange.length; i++) {
            for (let j = 0; j < criteriaRange[i].length; j++) {
                if (evaluateCriterion(criteriaRange[i][j], criterion)) {
                    const valToSum = sumRange[i]?.[j];
                    if (typeof valToSum === 'number') {
                        total += valToSum;
                    }
                }
            }
        }
        return String(total);
    },
    COUNTIF: (args, sheetData) => {
        const [rangeStr, criterion] = args;
        const values = getRangeValues(rangeStr, sheetData, false);
        let count = 0;
        for (const value of values) {
            if (evaluateCriterion(value, criterion)) {
                count++;
            }
        }
        return String(count);
    },
    VLOOKUP: (args, sheetData) => {
        const [searchKey, rangeStr, indexStr, isSortedStr] = args;
        const lookupValue = resolveArgument(searchKey, sheetData);
        const colIndex = parseInt(String(resolveArgument(indexStr, sheetData)), 10);
        
        if (isNaN(colIndex) || colIndex < 1) return '#VALUE!';

        const tableArray = getRangeValues2D(rangeStr, sheetData);
        if (colIndex > (tableArray[0]?.length || 0)) return '#REF!';
        
        // Exact match (isSorted is FALSE or omitted)
        for (const row of tableArray) {
            // Simple type coercion for comparison
            if (String(row[0]).toLowerCase() === String(lookupValue).toLowerCase()) {
                return String(row[colIndex - 1]);
            }
        }

        return '#N/A';
    },
};

export { functions };

export const evaluateFormula = (formula: string, sheetData: SheetData): CellData => {
    if (!formula || !formula.startsWith('=')) {
        const value = formula || '';
        return { value, displayValue: value };
    }

    const expression = formula.substring(1).toUpperCase();

    try {
        const functionMatch = expression.match(/^([A-Z]+)\((.*)\)$/);
        if (functionMatch) {
            const [, funcName, argsStr] = functionMatch;
            
            if (functions[funcName]) {
                 // Basic CSV-like split that handles strings and nested functions (simple cases)
                const args = argsStr.match(/(".*?"|[^",()]+(?:\(.*\))?)+/g)?.map(arg => arg.trim()) || [];
                const result = functions[funcName](args, sheetData);
                return { value: formula, displayValue: result };
            }
        }

        // Simple arithmetic, e.g., =A1+B2*5
        let safeExpression = expression.replace(/[A-Z]+\d+/g, (match) => {
            const val = getCellValue(match, sheetData);
            return String(val);
        });

        // Check if only safe characters are left
        if (/^[0-9+\-*/().\s]+$/.test(safeExpression)) {
            const result = new Function(`return ${safeExpression}`)();
            return { value: formula, displayValue: String(result) };
        }

        return { value: formula, displayValue: '#NAME?' };
    } catch (error) {
        return { value: formula, displayValue: '#ERROR!' };
    }
};