import React, { useState, useRef, useEffect } from 'react';
import { PaperclipIcon, MicIcon, SendIcon, XIcon, BroadcastIcon } from './icons.tsx';
import { FileAttachment } from '../types.ts';
import VoiceInputUI from './VoiceInputUI.tsx';
import { vibrate } from '../utils/haptics.ts';

const MAX_FILES = 5;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'text/plain', 'text/csv', 'text/markdown', 'application/pdf', 'application/json', 'text/html', 'text/xml'];

interface AiInputBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (prompt: string, attachments: FileAttachment[]) => void;
  isLoading: boolean;
  attachments: FileAttachment[];
  setAttachments: React.Dispatch<React.SetStateAction<FileAttachment[]>>;
  onLivePress: () => void;
}

const ThreeDotsSpinner = () => (
    <div className="flex gap-1 items-center justify-center">
        <div className="w-1.5 h-1.5 bg-black rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-1.5 h-1.5 bg-black rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-1.5 h-1.5 bg-black rounded-full animate-bounce"></div>
    </div>
);


const AiInputBar: React.FC<AiInputBarProps> = ({ value, onChange, onSubmit, isLoading, attachments, setAttachments, onLivePress }) => {
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((value.trim() || attachments.length > 0) && !isLoading) {
      vibrate();
      onSubmit(value, attachments);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
    }
  }

  const handleVoiceComplete = (transcript: string) => {
    setIsListening(false);
    if (transcript) {
        onChange(transcript);
        onSubmit(transcript, attachments);
    }
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newAttachments = [...attachments];

    for (const file of files as File[]) {
      if (newAttachments.length >= MAX_FILES) break;
      if (!ALLOWED_MIME_TYPES.includes(file.type) && file.type !== '') {
          // Allow files with no explicit mime-type, browser will attempt to read them as text.
          if(file.type) continue;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (file.type.startsWith('image/') || file.type === 'application/pdf') {
          newAttachments.push({ name: file.name, type: 'image', mimeType: file.type, content: content.split(',')[1] });
        } else {
          newAttachments.push({ name: file.name, type: 'text', mimeType: file.type || 'text/plain', content });
        }
        setAttachments([...newAttachments]);
      };
      
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    }
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full">
       <style>{`
        @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1.0); }
        }
        @keyframes moving-light {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
        .animated-comet-border {
            position: absolute;
            inset: -1.5px;
            border-radius: var(--radius-xl); 
            z-index: -1;
            background: linear-gradient(
                90deg, 
                transparent, 
                var(--color-accent-primary-hover),
                #9bfcf1,
                var(--color-accent-primary),
                transparent
            );
            background-size: 300% 100%;
            animation: moving-light 4s linear infinite;
            transition: opacity 0.5s;
            opacity: ${isLoading ? '0' : '0.8'};
        }
         @keyframes pulse-bg {
            0% { box-shadow: 0 0 0 0px rgba(0, 151, 230, 0.2); }
            50% { box-shadow: 0 0 0 4px rgba(0, 151, 230, 0.2); }
            100% { box-shadow: 0 0 0 0px rgba(0, 151, 230, 0.2); }
        }
        .loading-pulse {
            animation: pulse-bg 2s infinite cubic-bezier(0.4, 0, 0.6, 1);
        }
       `}</style>
       <div className="relative">
         <div className="animated-comet-border"></div>
          <div className={`relative bg-bg-secondary/80 backdrop-blur-2xl rounded-[var(--radius-xl)] shadow-2xl border border-white/10 overflow-hidden transition-all duration-300 ${isLoading ? 'loading-pulse' : ''}`} style={{ minHeight: '60px' }}>
            {isListening ? (
              <VoiceInputUI
                onClose={() => setIsListening(false)}
                onComplete={handleVoiceComplete}
                onAttachClick={() => {
                  setIsListening(false);
                  setTimeout(() => fileInputRef.current?.click(), 100);
                }}
              />
            ) : (
             <form onSubmit={handleSubmit} className="flex flex-col">
                {attachments.length > 0 && (
                    <div className="p-2 flex flex-wrap gap-2 border-b border-white/10">
                        {attachments.map((file, index) => (
                            <div key={index} className="flex items-center gap-1.5 bg-bg-tertiary/70 rounded-lg px-2 py-1 text-xs z-10">
                                <span className="text-text-secondary">{file.name}</span>
                                <button type="button" onClick={() => removeAttachment(index)} className="p-0.5 rounded-full hover:bg-bg-primary">
                                    <XIcon className="w-3 h-3 text-text-muted hover:text-text-primary"/>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                <div className="flex items-center p-2 z-10">
                   <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept={ALLOWED_MIME_TYPES.join(',')} className="hidden" />
                   <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-text-muted hover:text-text-primary transition-colors rounded-full" disabled={attachments.length >= MAX_FILES}>
                        <PaperclipIcon className="w-5 h-5"/>
                   </button>
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask anything or start a live conversation..."
                        className="flex-grow bg-transparent focus:outline-none text-text-primary placeholder-text-muted px-3"
                        disabled={isLoading}
                    />
                    <button type="button" onClick={() => setIsListening(true)} className="p-2 transition-colors rounded-full text-text-muted hover:text-text-primary hidden sm:inline-block">
                        <MicIcon className="w-5 h-5"/>
                    </button>
                    <button type="button" onClick={onLivePress} className="p-2 transition-colors rounded-full text-text-muted hover:text-text-primary" title="Start Live Conversation">
                        <BroadcastIcon className="w-5 h-5"/>
                    </button>
                   <button
                     type="submit"
                     disabled={isLoading || (!value.trim() && attachments.length === 0)}
                     className="w-9 h-9 flex items-center justify-center rounded-full bg-accent-primary hover:bg-accent-primary-hover disabled:bg-bg-tertiary/50 disabled:cursor-not-allowed transition-all flex-shrink-0 ml-1 transform hover:scale-110 disabled:scale-100"
                   >
                      {isLoading ? <ThreeDotsSpinner /> : <SendIcon className="w-5 h-5 text-black" />}
                    </button>
                </div>
             </form>
           )}
         </div>
       </div>
    </div>
  );
};

export default AiInputBar;