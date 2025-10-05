import React from 'react';
import { AnalysisItem } from '../types.ts';
import ChartJsComponent from './ChartJsComponent.tsx';
import AiSuggestions from './AiSuggestions.tsx';
import Citations from './Citations.tsx';
import { parseSimpleMarkdown } from '../utils/markdownParser.ts';
import { InfoIcon, SparklesIcon, CheckIcon } from './icons.tsx';

interface AnalysisCardProps {
    item: AnalysisItem;
    onSuggestionClick: (suggestion: string) => void;
}

const ExecutionView: React.FC<{ item: AnalysisItem }> = ({ item }) => (
    <div className="bg-bg-primary/50 p-4 rounded-xl text-sm text-text-secondary mt-4 border border-border-secondary">
        <div className="flex items-center gap-2 mb-3">
            <div className="relative">
                <SparklesIcon className="w-5 h-5 text-accent-primary" />
                <div className="absolute inset-0 -z-10 bg-accent-primary/50 blur-lg rounded-full animate-pulse"></div>
            </div>
            <h4 className="font-semibold text-text-primary text-xs uppercase tracking-wider">
                Executing Plan...
            </h4>
        </div>
        <p className="whitespace-pre-wrap border-l-2 border-accent-primary/30 pl-3 italic text-text-muted text-xs mb-4">{item.reasoning}</p>
        {item.steps && item.steps.length > 0 && (
            <ol className="space-y-2 text-xs pl-3">
                {item.steps.map((step, i) => (
                    <li key={i} className={`flex items-center gap-2.5 transition-opacity duration-300 ${item.currentStep >= i ? 'opacity-100' : 'opacity-50'}`}>
                       {item.currentStep > i ? (
                            <CheckIcon className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                       ) : (
                            <div className="w-3.5 h-3.5 border-2 border-accent-primary/50 border-t-accent-primary rounded-full animate-spin flex-shrink-0"></div>
                       )}
                        <span>{step}</span>
                    </li>
                ))}
            </ol>
        )}
    </div>
);

const ResultView: React.FC<{ item: AnalysisItem, onSuggestionClick: (suggestion: string) => void }> = ({ item, onSuggestionClick }) => (
    <>
        {item.result.type === 'info' && (
            <div className="text-sm text-text-secondary whitespace-pre-wrap prose" dangerouslySetInnerHTML={{ __html: parseSimpleMarkdown(item.result.payload) }}></div>
        )}

        {item.result.type === 'chart' && item.result.payload && (
             <div className="text-center text-xs text-text-muted italic my-4 p-2 bg-bg-primary/50 rounded-lg">
                Chart has been added to your workspace. You can drag and resize it.
             </div>
        )}

        {item.result.type === 'error' && (
            <div className="text-sm text-red-400 bg-red-900/20 p-3 rounded-lg">
                <p className="font-bold">Error:</p>
                <p>{item.result.payload}</p>
            </div>
        )}

        <div className="bg-bg-primary/50 p-4 rounded-xl text-sm text-text-secondary mt-4">
            <details>
                <summary className="flex items-center gap-2 cursor-pointer">
                    <InfoIcon />
                    <h4 className="font-semibold text-text-primary text-xs uppercase tracking-wider">
                        AI Plan
                    </h4>
                </summary>
                <div className="mt-3">
                    <p className="whitespace-pre-wrap border-l-2 border-border-primary pl-3 italic text-text-muted text-xs mb-3">{item.reasoning}</p>
                    {item.steps && item.steps.length > 0 && (
                        <ol className="list-decimal list-inside space-y-1 text-xs pl-3">
                            {item.steps.map((step, i) => <li key={i}>{step}</li>)}
                        </ol>
                    )}
                </div>
            </details>
        </div>

        {item.citations && <Citations citations={item.citations} />}
        <AiSuggestions suggestions={item.suggestions} onSelect={onSuggestionClick} />
    </>
);

const AnalysisCard: React.FC<AnalysisCardProps> = ({ item, onSuggestionClick }) => {
    return (
        <div className="bg-bg-primary/80 rounded-2xl p-4 border border-border-primary animate-fade-in-up">
            <style>{`
             @keyframes fade-in-up {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
             }
             .animate-fade-in-up {
                animation: fade-in-up 0.3s ease-out forwards;
             }
           `}</style>
            <div className="mb-3">
                <p className="text-xs text-text-muted mb-1">You asked:</p>
                <p className="text-sm font-semibold text-text-primary italic">"{item.prompt}"</p>
            </div>

            {item.isExecuting ? (
                <ExecutionView item={item} />
            ) : (
                <ResultView item={item} onSuggestionClick={onSuggestionClick} />
            )}
        </div>
    );
};

export default AnalysisCard;