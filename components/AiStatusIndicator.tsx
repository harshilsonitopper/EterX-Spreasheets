import React from 'react';

interface AiStatusIndicatorProps {
    isLoading: boolean;
}

const AiStatusIndicator: React.FC<AiStatusIndicatorProps> = ({ isLoading }) => {
    if (!isLoading) return null;

    return (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
            <style>{`
                @keyframes pulse-glow {
                    0%, 100% {
                        transform: scale(0.8);
                        box-shadow: 0 0 0 0 rgba(88, 166, 255, 0.7);
                    }
                    70% {
                        transform: scale(1);
                        box-shadow: 0 0 10px 15px rgba(88, 166, 255, 0);
                    }
                }
                .pulse-glow-indicator {
                    width: 12px;
                    height: 12px;
                    background-color: var(--color-accent-primary);
                    border-radius: 50%;
                    animation: pulse-glow 2s infinite ease-in-out;
                }
            `}</style>
            <div className="pulse-glow-indicator"></div>
        </div>
    );
};

export default AiStatusIndicator;