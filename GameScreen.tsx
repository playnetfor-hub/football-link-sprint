import React, { useState, useEffect, useRef } from 'react';
import { Challenge, GameStatus } from '../types';
import Card from './Card';
import { validateAnswer } from '../services/geminiService';
import { Loader2, ArrowRight, CheckCircle, XCircle } from 'lucide-react';

interface GameScreenProps {
  challenge: Challenge;
  onNextRound: (bonusTime: number) => void;
  onGameOver: () => void;
  onValidationChange: (isValidating: boolean) => void;
  score: number;
  timeLeft: number;
}

// --- Sound Utility (Web Audio API) ---
const playSound = (type: 'success' | 'error' | 'pop') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    
    // Primary Oscillator
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      // Cheerful chord arpeggio
      // Note 1
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.1); // C6
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);

      // Note 2 (Harmony)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.05); // E5
      gain2.gain.setValueAtTime(0.05, now + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc2.start(now + 0.05);
      osc2.stop(now + 0.45);

    } else if (type === 'error') {
      // Low thud/buzz
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
      
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      
      osc.start(now);
      osc.stop(now + 0.3);

    } else if (type === 'pop') {
      // Subtle pop for UI transition
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      
      osc.start(now);
      osc.stop(now + 0.08);
    }
  } catch (e) {
    // Silent fail if audio context not supported or blocked
    console.error("Audio playback error", e);
  }
};

const ConfettiBurst = () => {
  // Generate random particles
  const particles = Array.from({ length: 40 }).map((_, i) => {
    const angle = Math.random() * 360;
    // Spread particles around the center
    const distance = 120 + Math.random() * 200; 
    const tx = Math.cos(angle * Math.PI / 180) * distance;
    const ty = Math.sin(angle * Math.PI / 180) * distance;
    
    const colors = ['bg-emerald-400', 'bg-yellow-400', 'bg-blue-400', 'bg-purple-400', 'bg-pink-400', 'bg-white'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    // Random shapes
    const isCircle = Math.random() > 0.5;
    
    const style = {
      '--tx': `${tx}px`,
      '--ty': `${ty}px`,
      '--rot': `${Math.random() * 720}deg`,
      left: '50%',
      top: '50%',
      animationDelay: `${Math.random() * 0.1}s`,
    } as React.CSSProperties;

    return (
        <div
            key={i}
            className={`absolute ${isCircle ? 'rounded-full' : 'rounded-sm'} ${color} w-2 h-2 md:w-3 md:h-3 animate-confetti opacity-0 shadow-[0_0_10px_currentColor]`}
            style={style}
        />
    );
  });

  return (
    <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center overflow-visible">
       {/* Inject styles for this specific animation */}
      <style>
        {`
          @keyframes confetti-burst {
            0% { transform: translate(-50%, -50%) scale(0) rotate(0deg); opacity: 1; }
            60% { opacity: 1; }
            100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.5) rotate(var(--rot)); opacity: 0; }
          }
          .animate-confetti {
            animation: confetti-burst 0.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          }
        `}
      </style>
      {particles}
    </div>
  );
};

const GameScreen: React.FC<GameScreenProps> = ({ 
  challenge, 
  onNextRound, 
  onGameOver,
  onValidationChange,
  score,
  timeLeft 
}) => {
  const [input, setInput] = useState('');
  const [validating, setValidating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount and when challenge changes
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
    // Play sound when a new challenge appears
    playSound('pop');
  }, [challenge]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || validating) return;

    setValidating(true);
    onValidationChange(true);
    setFeedback({ type: null, message: '' });

    const result = await validateAnswer(
      challenge.cardA.name,
      challenge.cardB.name,
      input,
      challenge.possibleAnswers || []
    );

    if (result.isValid) {
      playSound('success');
      setFeedback({ type: 'success', message: 'إجابة صحيحة! +10 ثواني' });
      // Short delay to show success before next round
      setTimeout(() => {
        setInput('');
        setFeedback({ type: null, message: '' });
        onValidationChange(false);
        setValidating(false);
        onNextRound(10); // 10 seconds bonus
      }, 1500);
    } else {
      playSound('error');
      setFeedback({ type: 'error', message: result.reason || 'إجابة خاطئة، حاول مرة أخرى' });
      setValidating(false);
      onValidationChange(false);
      // Focus back on input
      if (inputRef.current) inputRef.current.focus();
    }
  };

  const handleSkip = () => {
    // Skip finding a new challenge without points.
    playSound('pop');
    onNextRound(0);
    setInput('');
    setFeedback({ type: null, message: '' });
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto px-4 py-6 min-h-[80vh] justify-center">
      
      {/* Header Stats */}
      <div className="w-full flex justify-between items-center mb-8 bg-slate-800/50 p-4 rounded-xl border border-slate-700 backdrop-blur-sm">
        <div className="flex flex-col">
          <span className="text-slate-400 text-xs uppercase">النقاط</span>
          <span className="text-2xl font-bold text-emerald-400">{score}</span>
        </div>
        
        <div className="flex flex-col items-end">
          <span className="text-slate-400 text-xs uppercase">الوقت المتبقي</span>
          <span className={`text-2xl font-bold font-mono ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
            {timeLeft}s
          </span>
        </div>
      </div>

      {/* Cards Arena */}
      <div className="relative w-full flex flex-col md:flex-row items-center justify-center gap-8 mb-10">
        {/* Celebration Animation */}
        {feedback.type === 'success' && <ConfettiBurst />}

        <Card entity={challenge.cardA} animationDelay="0s" />
        
        <div className="flex flex-col items-center justify-center z-10">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-700 rounded-full flex items-center justify-center border-4 border-slate-900 shadow-lg text-white font-bold text-xl">
            +
          </div>
        </div>
        
        <Card entity={challenge.cardB} animationDelay="0.1s" />
      </div>

      {/* Input Area */}
      <div className="w-full max-w-md relative z-20">
        <form onSubmit={handleSubmit} className="relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={validating}
            placeholder="اكتب اسم اللاعب الذي يربط بينهما..."
            className={`
              w-full bg-slate-800 text-white placeholder-slate-500
              border-2 ${feedback.type === 'error' ? 'border-red-500' : feedback.type === 'success' ? 'border-emerald-500' : 'border-slate-600 focus:border-emerald-500'}
              rounded-full py-4 px-6 pr-14 text-lg text-right
              outline-none transition-all shadow-lg
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          />
          <button
            type="submit"
            disabled={!input.trim() || validating}
            className="absolute left-2 top-2 bottom-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors disabled:bg-slate-700 disabled:text-slate-500"
          >
            {validating ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5 transform rotate-180" />}
          </button>
        </form>

        {/* Feedback Message */}
        {feedback.message && (
          <div className={`mt-4 flex items-center justify-center gap-2 p-3 rounded-lg ${feedback.type === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'} animate-in fade-in slide-in-from-top-2`}>
            {feedback.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            <span className="font-medium">{feedback.message}</span>
          </div>
        )}

        <button 
          onClick={handleSkip}
          disabled={validating}
          className="w-full mt-4 text-slate-500 hover:text-slate-300 text-sm transition-colors"
        >
          تخطي السؤال (بدون نقاط)
        </button>
      </div>
      
    </div>
  );
};

export default GameScreen;