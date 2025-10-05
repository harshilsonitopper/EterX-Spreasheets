import type { ChartType, ChartData, ChartOptions } from 'chart.js';

export interface CellStyle {
  backgroundColor?: string;
  color?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: 'underline' | 'line-through' | 'none';
  textAlign?: 'left' | 'center' | 'right';
}

export interface CellData {
  value: string;
  displayValue?: string;
  style?: CellStyle;
}

export type SheetData = (CellData | undefined)[][];

export interface Sheet {
  id: string;
  name: string;
  data: SheetData;
  comments?: { [cellRef: string]: string; };
}

export interface ChartConfig {
  type: ChartType;
  data: ChartData<any, any, any>;
  options: ChartOptions<any>;
}

export interface FloatingChartConfig extends ChartConfig {
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
}


export interface AnalysisItem {
  id: string;
  prompt: string;
  reasoning: string;
  steps?: string[];
  actions: any[]; // The full actions array from the AI for execution
  suggestions: string[];
  result: { // This will hold the FINAL primary result after execution
    type: 'data_update' | 'chart' | 'info' | 'error';
    payload: any;
  };
  citations?: GroundingChunk[];
  isExecuting?: boolean;
  currentStep?: number;
}


export interface GroundingChunk {
  web: {
    uri: string;
    title: string;
  };
}

export interface Theme {
  id:string;
  name: string;
  colors: {
    [key: string]: string;
  };
}

export interface FileAttachment {
  name: string;
  type: 'text' | 'image';
  mimeType: string;
  content: string; // text content or base64 string for images
}

export interface AiTask {
  id: string;
  title: string;
  status: 'processing' | 'completed' | 'error';
  currentStep: number;
  totalSteps: number;
}

export type ContextMenuAction = 
  | 'cut' | 'copy' | 'paste' 
  | 'insert_row_above' | 'insert_row_below' | 'delete_row' 
  | 'insert_col_left' | 'insert_col_right' | 'delete_col' 
  | 'clear_content'
  | 'style_bold' | 'style_italic' | 'style_underline'
  | 'style_align_left' | 'style_align_center' | 'style_align_right'
  | 'sort_asc' | 'sort_desc';
