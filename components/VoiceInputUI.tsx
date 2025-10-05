import React, { useEffect, useRef, useState, useCallback } from 'react';
import { XIcon, CheckIcon, PlusIcon } from './icons.tsx';

interface VoiceInputUIProps {
  onClose: () => void;
  onComplete: (transcript: string) => void;
  onAttachClick: () => void;
}

const VoiceInputUI: React.FC<VoiceInputUIProps> = ({ onClose, onComplete, onAttachClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const draw = useCallback(() => {
    if (!analyserRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteTimeDomainData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const hasSound = dataArray.some(v => v !== 128);

    if (!hasSound) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#888';
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        ctx.setLineDash([]);
    } else {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-text-primary').trim();
        ctx.beginPath();
        const sliceWidth = canvas.width * 1.0 / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * canvas.height / 2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            x += sliceWidth;
        }
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
    }
    animationFrameId.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const setupAudio = async () => {
      try {
        if (navigator.vibrate) {
            navigator.vibrate(100); // Vibrate for 100ms on start
        }
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 2048;
        const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
        source.connect(analyserRef.current);
        setIsRecording(true);
        draw();
      } catch (err) {
        console.error('Error accessing microphone:', err);
        onClose();
      }
    };

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            setFinalTranscript(prev => prev + event.results[i][0].transcript);
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setInterimTranscript(interim);
      };
      
      recognitionRef.current.onend = () => {
         if (isRecordingRef.current) {
            recognitionRef.current?.start();
         }
      }
      setupAudio();
      recognitionRef.current.start();
    } else {
      alert("Speech recognition not supported in this browser.");
      onClose();
    }
    
    const isRecordingRef = { current: true };
    
    return () => {
      isRecordingRef.current = false;
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      setIsRecording(false);
      recognitionRef.current?.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
      audioContextRef.current?.close();
    };
  }, [draw, onClose]);

  const handleConfirm = () => {
    onComplete((finalTranscript + interimTranscript).trim());
  };
  
  return (
    <div className="flex flex-col p-2 h-full animate-fade-in-up w-full justify-center">
         <style>{`
             @keyframes fade-in-up {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
             }
             .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
           `}</style>
      <div className="text-center text-sm text-text-secondary h-6 truncate">
        {finalTranscript}
        <span className="text-text-muted">{interimTranscript}</span>
        {!finalTranscript && !interimTranscript && <span className="text-text-muted">Listening...</span>}
      </div>
      <div className="flex items-center w-full mt-1">
        <button type="button" onClick={onAttachClick} className="p-2 text-text-muted hover:text-text-primary transition-colors rounded-full">
          <PlusIcon className="w-5 h-5" />
        </button>
        <canvas ref={canvasRef} className="flex-grow h-12 px-2" />
        <button type="button" onClick={onClose} className="p-2 text-text-muted hover:text-text-primary transition-colors rounded-full">
          <XIcon className="w-5 h-5" />
        </button>
        <button type="button" onClick={handleConfirm} className="p-2 text-green-400 hover:text-green-300 transition-colors rounded-full ml-1">
          <CheckIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default VoiceInputUI;
