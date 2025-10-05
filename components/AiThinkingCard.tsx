import React, { useState, useEffect } from 'react';
import { SparklesIcon } from './icons.tsx';

const STEPS = [
    "Analyzing prompt...",
    "Consulting spreadsheet data...",
    "Formulating execution plan...",
    "Cross-referencing knowledge...",
    "Generating actions...",
    "Finalizing response...",
];

const AiThinkingCard: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentStep((prevStep) => (prevStep + 1) % STEPS.length);
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-bg-primary rounded-lg p-4 border border-border-primary animate-fade-in-up">
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.3s ease-out forwards;
                }
                @keyframes text-fade-in {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .text-fade-in {
                    animation: text-fade-in 0.5s ease-out forwards;
                }
            `}</style>
            <div className="flex items-center gap-3">
                <div className="relative">
                    <SparklesIcon className="w-6 h-6 text-accent-primary" />
                    <div className="absolute inset-0 -z-10 bg-accent-primary/50 blur-lg rounded-full animate-pulse"></div>
                </div>
                <div>
                    <h3 className="font-semibold text-sm text-text-primary">AI is working...</h3>
                    <div className="text-xs text-text-muted h-4">
                        {STEPS.map((step, index) => (
                            <span
                                key={step}
                                className={`absolute transition-opacity duration-300 ${index === currentStep ? 'opacity-100 text-fade-in' : 'opacity-0'}`}
                            >
                                {step}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AiThinkingCard;
