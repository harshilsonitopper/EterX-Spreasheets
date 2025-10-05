
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SheetData, CellData, AnalysisItem, FloatingChartConfig, CellStyle, FileAttachment, Theme, Sheet, AiTask } from './types.ts';
import { TOTAL_ROWS, TOTAL_COLS } from './constants.ts';
import { evaluateFormula, functions as formulaFunctions } from './utils/formulaParser.ts';
import { getCellLabel, a1RangeToObjects, sheetDataToCsv, findContiguousRange } from './utils/sheetUtils.ts';
import { createChat, sendMessageToAi, needsWebSearch, getSearchBasedAiAnalysis, startLiveSession, getPredictiveFillSuggestions, getSmartFormatSuggestions } from './services/geminiService.ts';
import { v4 as uuidv4 } from 'uuid';
import type { Chat } from '@google/genai';

import MenuBar from './components/MenuBar.tsx';
import MainToolbar from './components/MainToolbar.tsx';
import FormulaBar from './components/FormulaBar.tsx';
import SpreadsheetGrid from './components/SpreadsheetGrid.tsx';
import SheetTabs from './components/SheetTabs.tsx';
import RightSidebar from './components/RightSidebar.tsx';
import AiInputBar from './components/AiInputBar.tsx';
import SplashScreen from './components/SplashScreen.tsx';
import FloatingChart from './components/FloatingChart.tsx';
import SettingsModal from './components/SettingsModal.tsx';
import StatusBar from './components/StatusBar.tsx';
import { ContextMenuAction } from './components/ContextMenu.tsx';
import { themes } from './themes.ts';
import AiStatusIndicator from './components/AiStatusIndicator.tsx';
import { SettingsIcon } from './components/icons.tsx';
import LiveTaskIndicator from './components/LiveTaskIndicator.tsx';
import LiveUIPanel from './components/LiveConversationModal.tsx';
import { getContrastingTextColor } from './utils/colorUtils.ts';
import { vibrate } from './utils/haptics.ts';


const createEmptySheetData = (): SheetData => Array.from({ length: TOTAL_ROWS }, () => Array.from({ length: TOTAL_COLS }, () => undefined));
const createNewSheet = (name: string): Sheet => ({
  id: uuidv4(),
  name,
  data: createEmptySheetData(),
  comments: {},
});

const App: React.FC = () => {
  const [sheets, setSheets] = useState<Sheet[]>([createNewSheet('Sheet1')]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);

  const [activeCell, setActiveCell] = useState({ row: 0, col: 0 });
  const [selection, setSelection] = useState({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
  
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisItem[]>([]);
  const [floatingCharts, setFloatingCharts] = useState<FloatingChartConfig[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const chatRef = useRef<Chat | null>(null);
  
  const [showSplash, setShowSplash] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [aiTasks, setAiTasks] = useState<AiTask[]>([]);
  const [zoomLevel, setZoomLevel] = useState(100);
  
  const [clipboard, setClipboard] = useState<{ data: (CellData | undefined)[][], mode: 'cut' | 'copy' } | null>(null);
  const [predictiveFill, setPredictiveFill] = useState<{ col: number; suggestions: { row: number, value: string }[] } | null>(null);

  const [uiMode, setUiMode] = useState<'input' | 'live'>('input');


  const activeSheet = sheets[activeSheetIndex];

  const recalculateSheet = useCallback((data: SheetData): SheetData => {
    // This function now ensures displayValue is always present, fixing the save/load bug.
    const newData = data.map(row => row ? row.map(cell => cell ? {...cell} : undefined) : []);
    for (let r = 0; r < newData.length; r++) {
      for (let c = 0; c < (newData[r]?.length || 0); c++) {
        const cell = newData[r]?.[c];
        if (cell) {
          if (cell.value && cell.value.startsWith('=')) {
            const result = evaluateFormula(cell.value, newData);
            cell.displayValue = result.displayValue;
          } else {
            cell.displayValue = cell.value;
          }
        }
      }
    }
    return newData;
  }, []);

  const applyTheme = (theme: Theme) => {
     Object.entries(theme.colors).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value);
    });
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
        themeColorMeta.setAttribute('content', theme.colors['--color-bg-primary']);
    }
  };

  useEffect(() => {
    chatRef.current = createChat();
    setTimeout(() => {
        setShowSplash(false);
        vibrate(100);
    }, 3800);
    
    // Apply the light theme as default
    if (themes.length > 0) {
      applyTheme(themes.find(t => t.id === 'liquid-glass') || themes[0]);
    }
  }, []);
  
  const updateSheetData = (sheetIndex: number, updater: (prevSheet: Sheet) => Sheet) => {
    setSheets(prevSheets => {
      const newSheets = [...prevSheets];
      const oldSheet = newSheets[sheetIndex];
      const updatedSheet = updater(oldSheet);
      
      const recalculatedData = recalculateSheet(updatedSheet.data);
      newSheets[sheetIndex] = { ...updatedSheet, data: recalculatedData };

      return newSheets;
    });
  };

  const checkForPredictiveFill = useCallback(async (updatedRow: number, updatedCol: number, currentSheetData: SheetData) => {
    // Heuristics to trigger: must be in a column with data to its left and have at least 2 examples.
    if (updatedCol === 0) return;

    const leftColHasData = currentSheetData.some(row => row && row[updatedCol - 1]?.value);
    if (!leftColHasData) return;

    const examples = currentSheetData.map(row => row?.[updatedCol]?.value).slice(0, updatedRow + 1).filter(v => v !== undefined && v !== '');

    if (examples.length < 2) {
        setPredictiveFill(null);
        return;
    }
    
    // Prepare data for the AI
    const sourceData: (string|undefined)[][] = [];
    // Look at up to 2 columns to the left for context
    const startSourceCol = Math.max(0, updatedCol - 2); 
    const maxSourceRow = currentSheetData.findIndex((row, i) => i > updatedRow && !row?.[updatedCol]?.value);

    for (let r = 0; r <= (maxSourceRow !== -1 ? maxSourceRow : TOTAL_ROWS -1); r++) {
        const rowData = [];
        for (let c = startSourceCol; c < updatedCol; c++) {
            rowData.push(currentSheetData[r]?.[c]?.value);
        }
        sourceData.push(rowData);
    }
    
    const suggestions = await getPredictiveFillSuggestions(sourceData, examples);

    if (suggestions && suggestions.length > 0) {
        setPredictiveFill({
            col: updatedCol,
            suggestions: suggestions.map((value, i) => ({
                row: updatedRow + 1 + i,
                value
            }))
        });
    }
  }, []);

  const handleCellUpdate = (row: number, col: number, value: string) => {
    let updatedData: SheetData = [];
    updateSheetData(activeSheetIndex, (prevSheet) => {
      const newData = prevSheet.data.map(r => r ? [...r] : []);
      const oldCell = newData[row]?.[col] || {};
      newData[row] = [...(newData[row] || [])];
      newData[row][col] = { ...oldCell, value };
      updatedData = newData;
      return { ...prevSheet, data: newData };
    });
    // Use a timeout to allow state to update before checking
    setTimeout(() => checkForPredictiveFill(row, col, updatedData), 100);
  };
  
  const acceptPredictiveFill = () => {
    if (!predictiveFill) return;
    updateSheetData(activeSheetIndex, prevSheet => {
        const newData = prevSheet.data.map(r => r ? [...r] : []);
        predictiveFill.suggestions.forEach(sugg => {
            if (sugg.row < TOTAL_ROWS && predictiveFill.col < TOTAL_COLS) {
                const oldCell = newData[sugg.row]?.[predictiveFill.col] || {};
                newData[sugg.row][predictiveFill.col] = { ...oldCell, value: sugg.value };
            }
        });
        return { ...prevSheet, data: newData };
    });
    setPredictiveFill(null);
    vibrate(50);
  };

  const applyStyleToSelection = (style: Partial<CellStyle>) => {
    const { startRow, endRow, startCol, endCol } = selection;
    updateSheetData(activeSheetIndex, prevSheet => {
        const newData = prevSheet.data.map(r => r ? [...r] : []);
        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                const oldCell = newData[r]?.[c] || { value: '' };
                const oldStyle = oldCell.style || {};
                
                let newStyle = { ...oldStyle };

                // Toggleable styles
                if (style.fontWeight) newStyle.fontWeight = oldStyle.fontWeight === 'bold' ? 'normal' : 'bold';
                if (style.fontStyle) newStyle.fontStyle = oldStyle.fontStyle === 'italic' ? 'normal' : 'italic';
                if (style.textDecoration) newStyle.textDecoration = oldStyle.textDecoration === 'underline' ? 'none' : 'underline';
                if (style.textAlign) newStyle.textAlign = oldStyle.textAlign === style.textAlign ? undefined : style.textAlign;
                
                // Color styles (apply or clear)
                if (style.backgroundColor) {
                    newStyle.backgroundColor = oldStyle.backgroundColor === style.backgroundColor ? undefined : style.backgroundColor;
                    // Auto-apply contrasting text color for readability
                    if (newStyle.backgroundColor) {
                       newStyle.color = getContrastingTextColor(newStyle.backgroundColor);
                    } else {
                       // If background is cleared, reset text color too
                       delete newStyle.color;
                    }
                }
                if (style.color) newStyle.color = oldStyle.color === style.color ? undefined : style.color;


                newData[r][c] = { ...oldCell, style: newStyle };
            }
        }
        return { ...prevSheet, data: newData };
    });
  };

  const handleSelectionChange = (newSelection: typeof selection) => {
    const normalized = {
      startRow: Math.min(newSelection.startRow, newSelection.endRow),
      endRow: Math.max(newSelection.startRow, newSelection.endRow),
      startCol: Math.min(newSelection.startCol, newSelection.endCol),
      endCol: Math.max(newSelection.startCol, newSelection.endCol),
    };
    setSelection(normalized);
  };

  const handleSmartSelect = (row: number, col: number) => {
      const range = findContiguousRange(row, col, activeSheet.data);
      if (range) {
          handleSelectionChange(range);
          vibrate(30);
      }
  };

  const handleSmartFormat = async () => {
    const actions = await getSmartFormatSuggestions(activeSheet.data, selection);
    if (actions && actions.length > 0) {
      const newAnalysisItem: AnalysisItem = {
        id: uuidv4(),
        prompt: "Smart Format",
        reasoning: "AI-powered automatic formatting based on data content.",
        steps: ["Applying header styles", "Adding alternating row colors", "Aligning numerical data"],
        actions: actions,
        suggestions: ["Create a chart from this data", "Summarize this data"],
        isExecuting: true,
        currentStep: 0,
        result: { type: 'data_update', payload: "Smart formatting applied." }
      };
      setAnalysisHistory(prev => [...prev, newAnalysisItem]);
      executeAiActions(newAnalysisItem);
    }
  };
  
  const handleAiSubmit = async (prompt: string, attachedFiles: FileAttachment[]) => {
    if (!prompt.trim() && attachedFiles.length === 0) return;
    setAiPrompt('');
    setAttachments([]);
    setIsAiLoading(true);
    
    if (!chatRef.current) chatRef.current = createChat();

    let finalPrompt = prompt;
    let citations: any[] = [];

    if (await needsWebSearch(prompt)) {
        const searchResult = await getSearchBasedAiAnalysis(prompt, activeSheet.data, selection);
        finalPrompt = `The user's original query was: "${prompt}". I have performed a web search and found the following information. Please use this information to perform the user's request on their spreadsheet.\n\nSearch Result:\n${searchResult.text}`;
        citations = searchResult.citations;
    }

    const result = await sendMessageToAi(chatRef.current, finalPrompt, activeSheet.data, selection, attachedFiles);
    setIsAiLoading(false);

    // Determine primary result type for the final card state
    const firstAction = result.actions?.[0];
    let resultType: AnalysisItem['result']['type'] = 'data_update';
    let resultPayload: any = "Data has been updated.";
    if (!result.actions || result.actions.length === 0) {
        resultType = 'info';
        resultPayload = "I've reviewed your request and provided some thoughts, but no direct actions were taken on the sheet.";
    } else if (firstAction?.actionType === 'CREATE_CHART') {
        resultType = 'chart';
        resultPayload = firstAction.payload?.chartConfig;
    } else if (firstAction?.actionType === 'INFO') {
        resultType = 'info';
        resultPayload = firstAction.payload?.text;
    }

    const newAnalysisItem: AnalysisItem = {
      id: uuidv4(),
      prompt: prompt || `Analysis of ${attachedFiles.map(f => f.name).join(', ')}`,
      reasoning: result.reasoning,
      steps: result.steps,
      actions: result.actions || [],
      suggestions: result.suggestions,
      citations: result.citations || citations,
      isExecuting: true,
      currentStep: 0,
      result: {
        type: resultType,
        payload: resultPayload
      }
    };
    setAnalysisHistory(prev => [...prev, newAnalysisItem]);

    // Asynchronously execute actions
    executeAiActions(newAnalysisItem);
  };
  
  const executeLiveAiAction = (action: {actionType: string, payload: any}) => {
    const analysisId = `live-${uuidv4()}`;
    const newAnalysisItem: AnalysisItem = {
      id: analysisId,
      prompt: `Live Action: ${action.actionType}`,
      reasoning: "Action initiated via live conversation.",
      steps: [action.actionType],
      actions: [action],
      suggestions: [],
      isExecuting: true,
      currentStep: 0,
      result: { type: 'data_update', payload: 'Live update executed' }
    };
    setAnalysisHistory(prev => [...prev, newAnalysisItem]);
    executeAiActions(newAnalysisItem);
    return "Action executed successfully.";
  }

  const executeAiActions = async (analysisItem: AnalysisItem) => {
    vibrate(50); // Vibrate on task start
    const { id: analysisId, actions, prompt } = analysisItem;
    
    // Add a new task to the notification queue
    const taskId = `task-${analysisId}`;
    const newTask: AiTask = { id: taskId, title: prompt.substring(0, 50), status: 'processing', currentStep: 0, totalSteps: actions.length };
    setAiTasks(prev => [...prev, newTask]);

    for (const [index, action] of actions.entries()) {
        setAnalysisHistory(prev => prev.map(item =>
            item.id === analysisId ? { ...item, currentStep: index } : item
        ));
         setAiTasks(prev => prev.map(task => 
            task.id === taskId ? { ...task, currentStep: index + 1 } : task
        ));

        await new Promise(res => setTimeout(res, 400)); // Dramatic pause for each step

        const { actionType, payload } = action;

        // Handle UI actions that don't modify sheet data directly
        if (actionType === 'CREATE_CHART') {
            setFloatingCharts(prev => [...prev, {
                ...payload.chartConfig,
                id: uuidv4(),
                position: { x: 100 + prev.length * 20, y: 100 + prev.length * 20 },
                size: { width: 500, height: 300 }
            }]);
            continue;
        }
        
        // Handle actions that modify the sheet structure
        if (actionType === 'ADD_SHEET') {
            setSheets(prev => {
                const newSheets = [...prev, createNewSheet(payload.sheetName)];
                // Set the new sheet as active immediately after creation
                setActiveSheetIndex(newSheets.length - 1);
                return newSheets;
            });
            continue;
        }
        if (actionType === 'RENAME_SHEET') {
            handleRenameSheet(payload.sheetIndex, payload.sheetName);
            continue;
        }
        if (actionType === 'DELETE_SHEET') {
            handleDeleteSheet(payload.sheetIndex);
            continue;
        }
        if (actionType === 'INFO') {
            continue; // INFO actions are for display and don't modify the sheet
        }

        // All remaining actions modify the *data* of the current sheet
        updateSheetData(activeSheetIndex, currentSheet => {
            let newData = currentSheet.data.map(r => (r ? [...r] : []));
            let newComments = { ...(currentSheet.comments || {}) };
            
            switch (actionType) {
                case 'UPDATE_CELLS':
                    payload.updates?.forEach((update: {row: number, col: number, value: string}) => {
                        const { row, col, value } = update;
                        if (row < TOTAL_ROWS && col < TOTAL_COLS) {
                           const oldCell = newData[row]?.[col] || {};
                           newData[row] = [...(newData[row] || [])];
                           newData[row][col] = { ...oldCell, value: String(value) };
                        }
                    });
                    return { ...currentSheet, data: newData };
                case 'APPLY_STYLE':
                     if (payload.range && payload.style) {
                        const { startRow, endRow, startCol, endCol } = a1RangeToObjects(payload.range);
                        for (let r = startRow; r <= endRow; r++) {
                            for (let c = startCol; c <= endCol; c++) {
                                if (r < TOTAL_ROWS && c < TOTAL_COLS) {
                                    const oldCell = newData[r]?.[c] || { value: '' };
                                    // Smart Style merging: don't create a new style object if one doesn't exist, unless necessary
                                    let mergedStyle = oldCell.style ? { ...oldCell.style } : {};
                                    let styleChanged = false;
                                    for(const key in payload.style) {
                                        if (Object.prototype.hasOwnProperty.call(payload.style, key)) {
                                            const styleKey = key as keyof CellStyle;
                                            if (mergedStyle[styleKey] !== payload.style[key]) {
                                                // FIX: Type 'any' is not assignable to type 'never'.
                                                // The `payload.style` object comes from an API and is not strictly typed.
                                                // Casting `mergedStyle` to `any` allows assignment of potentially wider types
                                                // (e.g., string) to properties that might have specific literal types (e.g., 'left' | 'right').
                                                (mergedStyle as any)[styleKey] = payload.style[key];
                                                styleChanged = true;
                                            }
                                        }
                                    }

                                    if(styleChanged) {
                                        // Ensure text is readable if a background color is applied
                                        if (payload.style.backgroundColor) {
                                            mergedStyle.color = getContrastingTextColor(payload.style.backgroundColor);
                                        }
                                        newData[r][c] = { ...oldCell, style: mergedStyle };
                                    }
                                }
                            }
                        }
                    }
                    return { ...currentSheet, data: newData };
                case 'ADD_COMMENT':
                   if (payload.range && payload.text) {
                       newComments[payload.range] = payload.text;
                    }
                    return { ...currentSheet, comments: newComments };
                case 'SORT_RANGE':
                    if(payload.range && payload.sort) {
                        const { startRow, endRow, startCol, endCol } = a1RangeToObjects(payload.range);
                        const { column, order } = payload.sort;
                        const sortColIndex = startCol + column;
                        
                        const rangeData = newData.slice(startRow, endRow + 1);
                        rangeData.sort((a, b) => {
                            const valA = a?.[sortColIndex]?.value || '';
                            const valB = b?.[sortColIndex]?.value || '';
                            const numA = parseFloat(valA);
                            const numB = parseFloat(valB);
                            
                            let compareResult = 0;
                            if (!isNaN(numA) && !isNaN(numB)) {
                                compareResult = numA - numB;
                            } else {
                                compareResult = valA.localeCompare(valB);
                            }
                            return order === 'ascending' ? compareResult : -compareResult;
                        });
                        newData.splice(startRow, rangeData.length, ...rangeData);
                    }
                    return { ...currentSheet, data: newData };
                case 'INSERT_ROWS':
                     if (payload.rows) {
                        const { index, count } = payload.rows;
                        const newRows = Array.from({ length: count }, () => Array.from({ length: TOTAL_COLS }, () => undefined));
                        newData.splice(index, 0, ...newRows);
                        newData.splice(TOTAL_ROWS);
                    }
                    return { ...currentSheet, data: newData };
                 case 'DELETE_ROWS':
                    if (payload.rows) {
                        const { index, count } = payload.rows;
                        newData.splice(index, count);
                        const newRows = Array.from({ length: count }, () => Array.from({ length: TOTAL_COLS }, () => undefined));
                        newData.push(...newRows);
                    }
                    return { ...currentSheet, data: newData };
                case 'INSERT_COLS':
                    if (payload.cols) {
                        const { index, count } = payload.cols;
                        newData.forEach(row => {
                           if (!row) return;
                           const newCols = Array.from({ length: count }, () => undefined);
                           row.splice(index, 0, ...newCols);
                           row.splice(TOTAL_COLS);
                        });
                    }
                    return { ...currentSheet, data: newData };
                case 'DELETE_COLS':
                     if (payload.cols) {
                        const { index, count } = payload.cols;
                        newData.forEach(row => {
                            if (!row) return;
                            row.splice(index, count);
                            const newCols = Array.from({ length: count }, () => undefined);
                            row.push(...newCols);
                        });
                    }
                    return { ...currentSheet, data: newData };
            }
            return currentSheet;
        });
    }

     // Mark execution as complete
    setAnalysisHistory(prev => prev.map(item => 
        item.id === analysisId ? { ...item, isExecuting: false } : item
    ));
    setAiTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status: 'completed' } : task
    ));
    vibrate([20, 30, 40]); // Vibrate on task completion
  };
  
  const handleContextMenuAction = (action: ContextMenuAction, sel: typeof selection) => {
    updateSheetData(activeSheetIndex, prevSheet => {
        let newData = prevSheet.data.map(r => r ? [...r] : []);
        const { startRow, endRow, startCol, endCol } = sel;
        const rowCount = endRow - startRow + 1;
        const colCount = endCol - startCol + 1;

        switch (action) {
            case 'insert_row_above': {
                const newRows = Array.from({ length: rowCount }, () => Array(TOTAL_COLS).fill(undefined));
                newData.splice(startRow, 0, ...newRows);
                newData = newData.slice(0, TOTAL_ROWS);
                break;
            }
            case 'insert_row_below': {
                const newRows = Array.from({ length: rowCount }, () => Array(TOTAL_COLS).fill(undefined));
                newData.splice(endRow + 1, 0, ...newRows);
                newData = newData.slice(0, TOTAL_ROWS);
                break;
            }
            case 'delete_row': {
                newData.splice(startRow, rowCount);
                const newRows = Array.from({ length: rowCount }, () => Array(TOTAL_COLS).fill(undefined));
                newData.push(...newRows);
                break;
            }
            case 'insert_col_left': {
                newData.forEach(row => row.splice(startCol, 0, ...Array(colCount).fill(undefined)));
                newData.forEach(row => row.splice(TOTAL_COLS));
                break;
            }
            case 'insert_col_right': {
                newData.forEach(row => row.splice(endCol + 1, 0, ...Array(colCount).fill(undefined)));
                newData.forEach(row => row.splice(TOTAL_COLS));
                break;
            }
            case 'delete_col': {
                newData.forEach(row => {
                    row.splice(startCol, colCount);
                    row.push(...Array(colCount).fill(undefined));
                });
                break;
            }
            case 'clear_content': {
                for (let r = startRow; r <= endRow; r++) {
                    for (let c = startCol; c <= endCol; c++) {
                        if (newData[r]?.[c]) {
                            newData[r][c] = { value: '' };
                        }
                    }
                }
                break;
            }
            case 'cut':
            case 'copy': {
                const copiedData = newData.slice(startRow, endRow + 1).map(row => row.slice(startCol, endCol + 1));
                setClipboard({ data: copiedData, mode: action });
                if (action === 'cut') {
                    for (let r = startRow; r <= endRow; r++) {
                        for (let c = startCol; c <= endCol; c++) {
                            if (newData[r]?.[c]) {
                                newData[r][c] = { value: '' };
                            }
                        }
                    }
                }
                break;
            }
            case 'paste': {
                if (!clipboard) break;
                const { data: clipboardData, mode } = clipboard;
                const pasteStartRow = activeCell.row;
                const pasteStartCol = activeCell.col;
                clipboardData.forEach((row, rIdx) => {
                    row.forEach((cell, cIdx) => {
                        const targetRow = pasteStartRow + rIdx;
                        const targetCol = pasteStartCol + cIdx;
                        if (targetRow < TOTAL_ROWS && targetCol < TOTAL_COLS) {
                            newData[targetRow][targetCol] = cell ? { ...cell } : undefined;
                        }
                    });
                });
                if (mode === 'cut') setClipboard(null);
                break;
            }
            case 'style_bold': applyStyleToSelection({ fontWeight: 'bold' }); break;
            case 'style_italic': applyStyleToSelection({ fontStyle: 'italic' }); break;
            case 'style_underline': applyStyleToSelection({ textDecoration: 'underline' }); break;
            case 'style_align_left': applyStyleToSelection({ textAlign: 'left' }); break;
            case 'style_align_center': applyStyleToSelection({ textAlign: 'center' }); break;
            case 'style_align_right': applyStyleToSelection({ textAlign: 'right' }); break;
            case 'sort_asc':
            case 'sort_desc': {
                const rangeData = newData.slice(startRow, endRow + 1);
                const sortColIndex = startCol; // Sort by first column of selection
                rangeData.sort((a, b) => {
                    const valA = a?.[sortColIndex]?.value || '';
                    const valB = b?.[sortColIndex]?.value || '';
                    const numA = parseFloat(valA);
                    const numB = parseFloat(valB);
                    
                    let compareResult = 0;
                    if (!isNaN(numA) && !isNaN(numB)) {
                        compareResult = numA - numB;
                    } else {
                        compareResult = valA.localeCompare(valB);
                    }
                    return action === 'sort_asc' ? compareResult : -compareResult;
                });
                newData.splice(startRow, rangeData.length, ...rangeData);
                break;
            }
        }
        return { ...prevSheet, data: newData };
    });
  };
  const handleNewChat = () => (chatRef.current = createChat(), setAnalysisHistory([]));
  const handleNewSheet = () => setSheets(prev => [...prev, createNewSheet(`Sheet${prev.length + 1}`)]);
  const handleDeleteSheet = (index: number) => {
    if (sheets.length <= 1) return; // Prevent deleting the last sheet
    setSheets(prev => {
        const newSheets = prev.filter((_, i) => i !== index);
        setActiveSheetIndex(Math.max(0, activeSheetIndex - 1));
        return newSheets;
    });
  };
  const handleSwitchSheet = (index: number) => setActiveSheetIndex(index);
  const handleRenameSheet = (index: number, newName: string) => {
    setSheets(prev => prev.map((sheet, i) => i === index ? { ...sheet, name: newName } : sheet));
  };
  
  const handleSaveSheet = () => {
    const dataStr = JSON.stringify(sheets);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', 'EterX_Workbook.json');
    linkElement.click();
  }

  const handleExportCsv = () => {
    const csvContent = sheetDataToCsv(activeSheet.data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${activeSheet.name}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleOpenSheet = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const newSheets = JSON.parse(e.target?.result as string);
          if (Array.isArray(newSheets) && newSheets.every(s => s.id && s.name && s.data)) {
            setSheets(newSheets.map(sheet => ({...sheet, comments: sheet.comments || {}, data: recalculateSheet(sheet.data)})));
            setActiveSheetIndex(0);
          } else {
            alert('Invalid sheet file format.');
          }
        } catch (error) {
          alert('Error parsing sheet file.');
        }
      };
      reader.readAsText(file);
    }
  };


  const activeCellValue = activeSheet.data[activeCell.row]?.[activeCell.col]?.value || '';

  return (
    <div className="h-screen w-screen bg-transparent text-text-primary flex flex-col font-sans overflow-hidden">
        {showSplash && <SplashScreen />}
        <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} onThemeChange={applyTheme} />

        <header className="flex-shrink-0 z-40 bg-bg-secondary/80 backdrop-blur-2xl border-b border-white/10 shadow-lg shadow-black/5" style={{borderRadius: '0 0 var(--radius-lg) var(--radius-lg)'}}>
            <MenuBar 
              onNewSheet={() => setSheets([createNewSheet('Sheet1')])} 
              onSaveSheet={handleSaveSheet} 
              onOpenSheet={handleOpenSheet} 
              onExportCsv={handleExportCsv}
              onContextMenuAction={(action) => handleContextMenuAction(action, selection)}
            />
            <MainToolbar onStyleApply={applyStyleToSelection} />
            <FormulaBar
                selectedCellLabel={getCellLabel(activeCell.row, activeCell.col)}
                cellValue={activeCellValue}
                onCellValueChange={value => handleCellUpdate(activeCell.row, activeCell.col, value)}
                onCommit={() => {}}
                availableFunctions={Object.keys(formulaFunctions)}
            />
        </header>

        <main className="flex-grow flex min-h-0 relative">
             <div className="fixed top-2.5 right-4 z-50 hidden sm:flex items-center gap-2">
                <LiveTaskIndicator tasks={aiTasks} />
                <button onClick={() => setShowSettings(true)} className="p-2 rounded-full text-text-muted bg-bg-secondary/50 hover:bg-bg-tertiary/70 hover:text-text-primary transition-colors" title="Settings">
                    <SettingsIcon className="w-5 h-5" />
                </button>
             </div>
             <AiStatusIndicator isLoading={isAiLoading} />
            <div className="flex-grow flex flex-col min-w-0 relative">
                <SpreadsheetGrid
                    sheetData={activeSheet.data}
                    comments={activeSheet.comments || {}}
                    zoomLevel={zoomLevel}
                    onCellUpdate={handleCellUpdate}
                    onContextMenuAction={handleContextMenuAction}
                    selection={selection}
                    onSelectionChange={handleSelectionChange}
                    onSmartSelect={handleSmartSelect}
                    onSmartFormat={handleSmartFormat}
                    activeCell={activeCell}
                    onActiveCellChange={setActiveCell}
                    predictiveFill={predictiveFill}
                    onAcceptPredictiveFill={acceptPredictiveFill}
                    onClearPredictiveFill={() => setPredictiveFill(null)}
                />
                 {floatingCharts.map((chart, index) => (
                    <FloatingChart
                        key={chart.id}
                        chartData={chart}
                        onClose={() => setFloatingCharts(prev => prev.filter(c => c.id !== chart.id))}
                        onUpdate={(id, updates) => setFloatingCharts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))}
                    />
                ))}
                <div className="bg-bg-primary/70 backdrop-blur-2xl border-t border-white/10 shadow-inner-top" style={{borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0'}}>
                  <StatusBar 
                      zoomLevel={zoomLevel} 
                      onZoomChange={setZoomLevel} 
                      selection={selection}
                      sheetData={activeSheet.data}
                  />
                  <SheetTabs 
                      sheets={sheets} 
                      activeSheetIndex={activeSheetIndex} 
                      onAddSheet={handleNewSheet} 
                      onSwitchSheet={handleSwitchSheet} 
                      onRenameSheet={handleRenameSheet}
                      onDeleteSheet={handleDeleteSheet}
                  />
                </div>
                 <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg sm:max-w-2xl px-4">
                    <div className={`transition-all duration-500 ease-in-out ui-mode-container ${uiMode === 'live' ? 'is-live' : ''}`}>
                         <style>{`
                            .ui-mode-container { position: relative; }
                            .ui-mode-container > div {
                                transition: opacity 0.4s ease-in-out, transform 0.4s ease-in-out;
                                will-change: transform, opacity;
                            }
                            .ui-mode-container.is-live .ai-input-bar-wrapper {
                                opacity: 0;
                                transform: translateY(20px) scale(0.95);
                                pointer-events: none;
                            }
                            .ui-mode-container .live-ui-panel-wrapper {
                                opacity: 0;
                                transform: translateY(20px) scale(0.95);
                                pointer-events: none;
                                position: absolute;
                                bottom: 0;
                                left: 0;
                                right: 0;
                            }
                             .ui-mode-container.is-live .live-ui-panel-wrapper {
                                opacity: 1;
                                transform: translateY(0) scale(1);
                                pointer-events: auto;
                            }
                        `}</style>
                        <div className="ai-input-bar-wrapper">
                             <AiInputBar
                                value={aiPrompt}
                                onChange={setAiPrompt}
                                onSubmit={handleAiSubmit}
                                isLoading={isAiLoading}
                                attachments={attachments}
                                setAttachments={setAttachments}
                                onLivePress={() => setUiMode('live')}
                            />
                        </div>
                        <div className="live-ui-panel-wrapper">
                             {uiMode === 'live' && (
                                <LiveUIPanel
                                    onClose={() => setUiMode('input')}
                                    onAction={executeLiveAiAction}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <RightSidebar
                analysisHistory={analysisHistory}
                onSuggestionClick={(suggestion) => setAiPrompt(suggestion)}
                onNewChat={handleNewChat}
                isAiLoading={isAiLoading}
                isOpen={isSidebarOpen}
                onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
            />
        </main>
    </div>
  );
};

export default App;
