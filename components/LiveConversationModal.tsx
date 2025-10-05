

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { XIcon } from './icons.tsx';
import type { LiveServerMessage, Blob } from '@google/genai';
import { startLiveSession } from '../services/geminiService.ts';
import { vibrate } from '../utils/haptics.ts';

interface LiveUIPanelProps {
  onClose: () => void;
  onAction: (action: { actionType: string, payload: any }) => string;
}

// Audio Utilities
const encode = (bytes: Uint8Array) => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const decode = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Perlin Noise for more natural waves
const perlin = {
    rand_vect: function(){
        let theta = Math.random() * 2 * Math.PI;
        return {x: Math.cos(theta), y: Math.sin(theta)};
    },
    dot_prod_grid: function(x:number, y:number, vx:number, vy:number){
        let g_vect;
        let d_vect = {x: x - vx, y: y - vy};
        // FIX: Type 'number[]' cannot be used as an index type. Convert array to string for key.
        const key = `${vx},${vy}`;
        if (this.gradients[key]){
            g_vect = this.gradients[key];
        } else {
            g_vect = this.rand_vect();
            this.gradients[key] = g_vect;
        }
        return d_vect.x * g_vect.x + d_vect.y * g_vect.y;
    },
    smootherstep: function(x:number){
        return 6*x**5 - 15*x**4 + 10*x**3;
    },
    interp: function(x:number, a:number, b:number){
        return a + this.smootherstep(x) * (b-a);
    },
    seed: function(){
        this.gradients = {};
    },
    get: function(x:number, y:number) {
        if (!this.gradients) this.seed();
        let xf = Math.floor(x);
        let yf = Math.floor(y);
        //interpolate
        let tl = this.dot_prod_grid(x, y, xf,   yf);
        let tr = this.dot_prod_grid(x, y, xf+1, yf);
        let bl = this.dot_prod_grid(x, y, xf,   yf+1);
        let br = this.dot_prod_grid(x, y, xf+1, yf+1);
        let xt = this.interp(x-xf, tl, tr);
        let xb = this.interp(x-xf, bl, br);
        let v = this.interp(y-yf, xt, xb);
        return v;
    }
}
perlin.seed();


const LiveUIPanel: React.FC<LiveUIPanelProps> = ({ onClose, onAction }) => {
    const sessionPromise = useRef<ReturnType<typeof startLiveSession> | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameId = useRef<number | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const nextStartTime = useRef(0);
    const outputAudioContext = useRef<AudioContext | null>(null);
    const sources = useRef(new Set<AudioBufferSourceNode>());
    const timeRef = useRef(0);
    const statusTimeoutRef = useRef<number | null>(null);

    const [statusText, setStatusText] = useState("Connecting...");

    const drawWave = useCallback(() => {
        animationFrameId.current = requestAnimationFrame(drawWave);
        
        if (!analyserRef.current || !canvasRef.current || !dataArrayRef.current) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const dataArray = dataArrayRef.current;

        if (!ctx) return;
        
        canvas.width = canvas.offsetWidth * window.devicePixelRatio;
        canvas.height = canvas.offsetHeight * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        analyserRef.current.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const amplitude = Math.max(5, (avg / 128.0) * canvas.offsetHeight * 0.3);
        
        timeRef.current += 0.005;

        const drawLiquidWave = (color: string, speed: number, yOffset: number, noiseScale: number, lineWidth: number, ampMultiplier: number) => {
            ctx.beginPath();
            ctx.moveTo(-10, canvas.height + 10);
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.shadowColor = color;
            ctx.shadowBlur = 20;

            for (let x = -10; x < canvas.width + 10; x++) {
                const noiseVal = perlin.get(x * noiseScale + timeRef.current * speed, timeRef.current * speed * 0.5);
                const y = canvas.height / 2 + yOffset + noiseVal * amplitude * ampMultiplier;
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        };
        
        ctx.globalCompositeOperation = 'lighter';
        drawLiquidWave('rgba(232, 160, 191, 0.7)', 1.2, 0, 0.01, 3, 1.2);      // Pinkish wave
        drawLiquidWave('rgba(160, 191, 232, 0.7)', 1, 0, 0.015, 3, 1);    // Blueish wave
        drawLiquidWave('rgba(255, 255, 255, 0.5)', 0.8, 5, 0.008, 2, 1.5);    // White highlight
        ctx.globalCompositeOperation = 'source-over';
    }, []);

    const handleMessage = useCallback(async (message: LiveServerMessage) => {
        if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);

        // Tool Call Handling
        if (message.toolCall) {
            for (const fc of message.toolCall.functionCalls) {
                const result = onAction({ actionType: fc.name, payload: fc.args });
                 sessionPromise.current?.then(session => {
                    session.sendToolResponse({
                        functionResponses: {
                            id: fc.id,
                            name: fc.name,
                            response: { result },
                        },
                    });
                });
            }
        }

        // Audio Output Handling
        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (base64Audio && outputAudioContext.current) {
            setStatusText("AI is speaking...");
            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext.current, 24000, 1);
            const source = outputAudioContext.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputAudioContext.current.destination);
            
            const onAudioEnd = () => {
                sources.current.delete(source);
                if (sources.current.size === 0) {
                   statusTimeoutRef.current = window.setTimeout(() => setStatusText("I'm listening..."), 200);
                }
            };
            source.addEventListener('ended', onAudioEnd);

            const currentTime = outputAudioContext.current.currentTime;
            const startTime = Math.max(nextStartTime.current, currentTime);
            source.start(startTime);
            nextStartTime.current = startTime + audioBuffer.duration;
            sources.current.add(source);
        }

        // Interruption Handling
        if (message.serverContent?.interrupted) {
            for (const source of sources.current.values()) {
                source.stop();
                sources.current.delete(source);
            }
            nextStartTime.current = 0;
            setStatusText("I'm listening...");
        }

    }, [onAction]);

    useEffect(() => {
        let stream: MediaStream;
        let inputAudioContext: AudioContext;

        const setup = async () => {
            try {
                vibrate(80);
                outputAudioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                
                sessionPromise.current = startLiveSession({
                    onopen: async () => {
                        setStatusText("I'm listening...");
                        inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        
                        analyserRef.current = inputAudioContext.createAnalyser();
                        analyserRef.current.fftSize = 128;
                        analyserRef.current.smoothingTimeConstant = 0.6;
                        dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
                        
                        const source = inputAudioContext.createMediaStreamSource(stream);
                        source.connect(analyserRef.current);

                        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                        
                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const l = inputData.length;
                            const int16 = new Int16Array(l);
                            for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
                            
                            const pcmBlob: Blob = {
                                data: encode(new Uint8Array(int16.buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            
                            sessionPromise.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContext.destination);

                        drawWave();
                    },
                    onmessage: handleMessage,
                    onerror: (e) => {
                        console.error('Live session error:', e)
                        setStatusText("Connection Error.");
                    },
                    onclose: () => {
                        setStatusText("Session Ended.");
                    },
                });

            } catch (err) {
                console.error('Failed to start live session:', err);
                onClose();
            }
        };

        setup();

        return () => {
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
            if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
            sessionPromise.current?.then(session => session.close());
            stream?.getTracks().forEach(track => track.stop());
            if (inputAudioContext?.state !== 'closed') inputAudioContext?.close();
            if (outputAudioContext.current?.state !== 'closed') outputAudioContext.current?.close();
        };
    }, [handleMessage, drawWave, onClose]);


    return (
        <div className="w-full h-[150px] relative">
             <style>{`
                 @property --clip-size {
                    syntax: '<percentage>';
                    initial-value: 0%;
                    inherits: false;
                }
                .live-panel-container {
                    animation: expand-clip 0.7s cubic-bezier(0.25, 1, 0.5, 1) forwards;
                    --clip-size: 150%;
                    clip-path: circle(var(--clip-size) at 50% 100%);
                }
                @keyframes expand-clip {
                    from { --clip-size: 0%; }
                    to { --clip-size: 150%; }
                }

                .live-panel-container::before {
                    content: '';
                    position: absolute;
                    inset: -2px;
                    border-radius: var(--radius-xl);
                    z-index: 0;
                    background: radial-gradient(circle at 50% 120%, var(--color-accent-primary), transparent 40%);
                    animation: pulse-light 1.5s ease-out forwards;
                }

                @keyframes pulse-light {
                    from { opacity: 0.8; transform: scale(0.5); }
                    to { opacity: 0; transform: scale(1.5); }
                }
             `}</style>
             <div className="live-panel-container absolute inset-0 bg-bg-secondary/60 backdrop-blur-2xl rounded-[var(--radius-xl)] shadow-2xl border border-white/10 overflow-hidden flex flex-col items-center justify-center p-4">
                <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />
                <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white/90 z-10 transition-colors">
                    <XIcon className="w-5 h-5"/>
                </button>
                <div className="absolute inset-x-0 bottom-6 text-center z-10 px-6">
                    <p className="text-lg h-8 text-white/90 font-medium tracking-wide font-title shadow-black/50 [text-shadow:0_2px_4px_var(--tw-shadow-color)] transition-opacity duration-300">
                        {statusText}
                    </p>
                </div>
             </div>
        </div>
    );
};

export default LiveUIPanel;