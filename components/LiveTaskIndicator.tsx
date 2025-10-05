import React, { useState, useEffect } from 'react';
import { AiTask } from '../types.ts';

const LiveTaskIndicator: React.FC<{ tasks: AiTask[] }> = ({ tasks }) => {
  const [activeTask, setActiveTask] = useState<AiTask | null>(null);

  useEffect(() => {
    const currentProcessingTask = tasks.find(t => t.status === 'processing');
    
    if (currentProcessingTask) {
        setActiveTask(currentProcessingTask);
    } else {
        // If there's an active task but it's no longer processing, it's done.
        // We set a timer to allow it to fade out.
        if (activeTask) {
            const timer = setTimeout(() => {
                setActiveTask(null);
            }, 500); // Keep it visible for the fade-out duration
            return () => clearTimeout(timer);
        }
    }
  }, [tasks, activeTask]);

  const isVisible = !!activeTask;
  const progress = activeTask ? (activeTask.totalSteps > 0 ? (activeTask.currentStep / activeTask.totalSteps) * 100 : 0) : 0;

  return (
    <div 
        className={`
          bg-bg-secondary/80 backdrop-blur-xl border border-white/10 rounded-full 
          flex items-center gap-3 px-4 py-2 shadow-lg
          transition-all duration-500 ease-in-out
          ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}
        `} 
    >
       <div className="w-4 h-4 border-2 border-accent-primary/50 border-t-accent-primary rounded-full animate-spin flex-shrink-0"></div>
       <div>
            <p className="text-xs font-semibold text-text-primary truncate max-w-[120px]">
                {activeTask?.title || 'Processing...'}
            </p>
            {activeTask && activeTask.totalSteps > 0 && (
                 <div className="h-1 bg-bg-tertiary rounded-full mt-1 overflow-hidden">
                    <div 
                        className="h-full bg-accent-primary rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            )}
       </div>
    </div>
  );
};

export default LiveTaskIndicator;
