import React, { useState, useRef, useEffect } from 'react';
import ChartJsComponent from './ChartJsComponent.tsx';
import type { FloatingChartConfig } from '../types.ts';
import { XIcon } from './icons.tsx';

interface FloatingChartProps {
  onClose: () => void;
  chartData: FloatingChartConfig;
  onUpdate: (id: string, updates: Partial<FloatingChartConfig>) => void;
}

const FloatingChart: React.FC<FloatingChartProps> = ({ onClose, chartData, onUpdate }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, modalX: 0, modalY: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  
  const { position, size, id } = chartData;

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      modalX: position.x,
      modalY: position.y,
    };
  };

  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        onUpdate(id, { position: {
          x: dragStartRef.current.modalX + dx,
          y: dragStartRef.current.modalY + dy,
        }});
      }
      if (isResizing) {
        const dx = e.clientX - resizeStartRef.current.x;
        const dy = e.clientY - resizeStartRef.current.y;
        onUpdate(id, { size: {
          width: Math.max(300, resizeStartRef.current.width + dx),
          height: Math.max(200, resizeStartRef.current.height + dy),
        }});
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, id, onUpdate]);

  return (
      <div
        ref={modalRef}
        className="absolute bg-bg-secondary/70 backdrop-blur-xl rounded-2xl shadow-xl flex flex-col pointer-events-auto resize overflow-hidden border border-white/10 z-30"
        style={{
          width: `${size.width}px`,
          height: `${size.height}px`,
          transform: `translate(${position.x}px, ${position.y}px)`,
        }}
      >
        <div
          className="flex justify-between items-center p-2 flex-shrink-0 cursor-move border-b border-white/10"
          onMouseDown={handleDragStart}
        >
          <h2 className="text-sm font-semibold text-text-primary px-2">{chartData.options?.plugins?.title?.text || 'Chart'}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-bg-tertiary/70 z-10">
            <XIcon className="text-text-muted w-5 h-5" />
          </button>
        </div>
        <div className="flex-grow relative min-h-0 p-4 pt-2">
          <ChartJsComponent
            type={chartData.type}
            data={chartData.data}
            options={{...chartData.options, responsive: true, maintainAspectRatio: false }}
          />
        </div>
        <div 
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onMouseDown={handleResizeStart}
        />
      </div>
  );
};

export default FloatingChart;