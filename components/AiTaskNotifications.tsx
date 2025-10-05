import React, { useEffect, useState } from 'react';
import { AiTask } from '../types.ts';
import { SparklesIcon, CheckIcon } from './icons.tsx';

interface AiTaskNotificationCardProps {
  task: AiTask;
  onDismiss: (id: string) => void;
}

const AiTaskNotificationCard: React.FC<AiTaskNotificationCardProps> = ({ task, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setIsVisible(true));
    
    // If task is completed, set a timer to animate out
    if (task.status === 'completed' || task.status === 'error') {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 3000); // Wait 3 seconds before dismissing

      return () => clearTimeout(timer);
    }
  }, [task.status]);

  useEffect(() => {
    // After the fade-out animation completes, call the dismiss function
    if (!isVisible && (task.status === 'completed' || task.status === 'error')) {
        const dismissTimer = setTimeout(() => onDismiss(task.id), 300); // Duration of fade-out animation
        return () => clearTimeout(dismissTimer);
    }
  }, [isVisible, task.id, task.status, onDismiss]);

  const progress = task.totalSteps > 0 ? (task.currentStep / task.totalSteps) * 100 : 0;

  return (
    <div className={`
      bg-bg-secondary/60 backdrop-blur-xl border border-border-primary/50 
      rounded-lg shadow-2xl p-3 w-64
      transition-all duration-300 ease-in-out
      ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
    `}>
      <div className="flex items-start gap-3">
        {task.status === 'processing' ? (
          <div className="w-4 h-4 mt-1 border-2 border-accent-primary/50 border-t-accent-primary rounded-full animate-spin flex-shrink-0"></div>
        ) : (
          <CheckIcon className="w-4 h-4 mt-1 text-green-400 flex-shrink-0" />
        )}
        <div>
          <p className="text-xs font-semibold text-text-primary truncate">{task.title}</p>
          <p className="text-xs text-text-muted mt-1">
            {task.status === 'processing' ? `Step ${task.currentStep} of ${task.totalSteps}` : 'Completed'}
          </p>
        </div>
      </div>
      {task.status === 'processing' && task.totalSteps > 0 && (
        <div className="h-1 bg-bg-tertiary rounded-full mt-2 overflow-hidden">
          <div 
            className="h-full bg-accent-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
    </div>
  );
};


interface AiTaskNotificationsProps {
  tasks: AiTask[];
  onDismiss: (id: string) => void;
}

const AiTaskNotifications: React.FC<AiTaskNotificationsProps> = ({ tasks, onDismiss }) => {
  if (tasks.length === 0) return null;

  return (
    <div className="fixed top-14 right-4 z-[100] space-y-2">
      {tasks.map(task => (
        <AiTaskNotificationCard key={task.id} task={task} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

export default AiTaskNotifications;