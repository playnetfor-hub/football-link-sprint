import React, { useState, useEffect, useCallback } from 'react';
import { GameStatus, GameState, Challenge, Difficulty } from './types';
import { generateChallenge } from './services/geminiService';
import GameScreen from './components/GameScreen';
import { BrainCircuit, Trophy, RotateCcw, Play, Zap, ShieldCheck, Flame, AlertCircle } from 'lucide-react';

const TIME_LIMITS = {
  [Difficulty.EASY]: 90,
  [Difficulty.MEDIUM]: 60,
  [Difficulty.HARD]: 45
};

// --- Reusable Loading Overlay ---
const LoadingOverlay = ({ message }: { message: string }) => (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
    <div className="relative mb-8">
      {/* Outer spinning ring */}
      <div className="w-24 h-24 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin shadow-2xl shadow-emerald-500/20"></div>
      
      {/* Middle pulsing ring */}
      <div className="absolute inset-0 m-2 border-4 border-slate-800 border-b-blue-500 rounded-full animate-spin-reverse opacity-70"></div>
      
      {/* Center glowing dot */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-4 h-4 bg-white rounded-full animate-ping shadow-[0_0_15px_white]"></div>
      </div>
    </div>
    
    <h3 className="text-2xl font-bold text-white tracking-wide mb-2 animate-pulse">
      {message}
    </h3>
    <p className="text-slate-400 text-sm font-mono tracking-widest uppercase">
      جاري المعالجة...
    </p>
    
    <style>{`
      @keyframes spin-reverse {
        from { transform: rotate(360deg); }
        to { transform: rotate(0deg); }
      }
      .animate-spin-reverse {
        animation: spin-reverse 3s linear infinite;
      }
    `}</style>
  </div>
);

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    status: GameStatus.IDLE,
    score: 0,
    timeLeft: TIME_LIMITS[Difficulty.MEDIUM],
    currentChallenge: null,
    message: null,
    difficulty: Difficulty.MEDIUM,
    history: [],
    seenEntities: []
  });

  const [highScore, setHighScore] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Timer Effect
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (gameState.status === GameStatus.PLAYING && gameState.timeLeft > 0) {
      timer = setInterval(() => {
        setGameState(prev => {
          if (prev.timeLeft <= 1) {
            return { ...prev, timeLeft: 0, status: GameStatus.GAME_OVER };
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState.status, gameState.timeLeft]);

  // Load first challenge when starting
  const startGame = async () => {
    setError(null);
    setGameState(prev => ({
      ...prev,
      status: GameStatus.LOADING_CHALLENGE,
      score: 0,
      timeLeft: TIME_LIMITS[prev.difficulty],
      history: [],
      seenEntities: [] // Reset seen entities on new game
    }));

    try {
      const challenge = await generateChallenge(gameState.difficulty, []);
      
      // Update seen entities
      const newSeen = [challenge.cardA.name, challenge.cardB.name];

      setGameState(prev => ({
        ...prev,
        status: GameStatus.PLAYING,
        currentChallenge: challenge,
        seenEntities: newSeen
      }));
    } catch (e) {
      console.error("Failed to start game:", e);
      setGameState(prev => ({ ...prev, status: GameStatus.IDLE }));
      setError("الخوادم مشغولة حالياً أو انتهت حصة الاستخدام. يرجى المحاولة لاحقاً.");
    }
  };

  // Load next challenge
  const handleNextRound = async (bonusTime: number) => {
    setError(null);
    // Optimistically update score and set loading
    setGameState(prev => ({
      ...prev,
      score: bonusTime > 0 ? prev.score + 1 : prev.score,
      timeLeft: prev.timeLeft + bonusTime,
      status: GameStatus.LOADING_CHALLENGE
    }));

    try {
      const challenge = await generateChallenge(gameState.difficulty, gameState.seenEntities);
      
      setGameState(prev => ({
        ...prev,
        status: GameStatus.PLAYING,
        currentChallenge: challenge,
        seenEntities: [...prev.seenEntities, challenge.cardA.name, challenge.cardB.name]
      }));
    } catch (e) {
       console.error("Failed to load next round:", e);
       // If next round fails, we can either end the game or let them try again.
       // Ending the game saves the score.
       setGameState(prev => ({ ...prev, status: GameStatus.GAME_OVER }));
       setError("حدث خطأ أثناء تحميل السؤال التالي.");
    }
  };

  const resetGame = () => {
    if (gameState.score > highScore) {
      setHighScore(gameState.score);
    }
    setError(null);
    setGameState(prev => ({ ...prev, status: GameStatus.IDLE }));
  };

  const setDifficulty = (level: Difficulty) => {
    setGameState(prev => ({ ...prev, difficulty: level }));
  };

  // Determine which loading message to show, if any
  const showLoading = gameState.status === GameStatus.LOADING_CHALLENGE || isValidating;
  const loadingMessage = isValidating ? "جاري التحقق من الإجابة..." : "جاري تحضير اللغز التالي...";

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 text-white font-sans selection:bg-emerald-500 selection:text-white">
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black -z-10"></div>
      <div className="fixed inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none -z-10"></div>

      {/* Global Loading Overlay */}
      {showLoading && <LoadingOverlay message={loadingMessage} />}

      {/* Main Content Switcher */}
      <main className="container mx-auto px-4 min-h-screen flex flex-col">
        
        {/* App Title (Small in game, big in menu) */}
        <header className={`py-6 flex justify-center transition-all duration-500 ${gameState.status === GameStatus.IDLE ? 'scale-100 mt-10' : 'scale-75 mt-0 opacity-50'}`}>
           <div className="flex items-center gap-3">
             <div className="bg-emerald-500 p-2 rounded-lg rotate-3 shadow-[0_0_15px_rgba(16,185,129,0.5)]">
               <BrainCircuit className="w-8 h-8 text-slate-900" />
             </div>
             <h1 className="text-3xl md:text-5xl font-black tracking-tighter bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
               سبرينت <span className="text-emerald-500">الكرة</span>
             </h1>
           </div>
        </header>

        {/* Error Banner */}
        {error && (
          <div className="max-w-md mx-auto mb-4 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center gap-2 animate-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* --- IDLE SCREEN --- */}
        {gameState.status === GameStatus.IDLE && (
          <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto text-center space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            <div className="space-y-4">
              <p className="text-xl md:text-2xl text-slate-300 leading-relaxed">
                اختبر معلوماتك الكروية في تحدي السرعة.
                <br />
                نظهر لك كرتين، وأنت تعطينا <span className="text-emerald-400 font-bold">الرابط</span>.
              </p>
            </div>

            {/* Difficulty Selector */}
            <div className="w-full max-w-lg mx-auto">
              <h3 className="text-slate-400 mb-4 text-sm font-semibold tracking-wider">اختر مستوى الصعوبة</h3>
              <div className="grid grid-cols-3 gap-3 p-1.5 bg-slate-900 rounded-2xl border border-slate-800">
                <button
                  onClick={() => setDifficulty(Difficulty.EASY)}
                  className={`
                    flex flex-col items-center justify-center gap-2 py-4 rounded-xl transition-all duration-200
                    ${gameState.difficulty === Difficulty.EASY 
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 border ring-1 ring-emerald-500/20' 
                      : 'hover:bg-slate-800 text-slate-500 border border-transparent'}
                  `}
                >
                  <ShieldCheck className="w-6 h-6" />
                  <span className="font-bold text-sm">سهل</span>
                  <span className="text-xs opacity-70">90 ثانية</span>
                </button>

                <button
                  onClick={() => setDifficulty(Difficulty.MEDIUM)}
                  className={`
                    flex flex-col items-center justify-center gap-2 py-4 rounded-xl transition-all duration-200
                    ${gameState.difficulty === Difficulty.MEDIUM 
                      ? 'bg-blue-500/10 border-blue-500 text-blue-400 border ring-1 ring-blue-500/20' 
                      : 'hover:bg-slate-800 text-slate-500 border border-transparent'}
                  `}
                >
                  <Zap className="w-6 h-6" />
                  <span className="font-bold text-sm">متوسط</span>
                  <span className="text-xs opacity-70">60 ثانية</span>
                </button>

                <button
                  onClick={() => setDifficulty(Difficulty.HARD)}
                  className={`
                    flex flex-col items-center justify-center gap-2 py-4 rounded-xl transition-all duration-200
                    ${gameState.difficulty === Difficulty.HARD 
                      ? 'bg-red-500/10 border-red-500 text-red-400 border ring-1 ring-red-500/20' 
                      : 'hover:bg-slate-800 text-slate-500 border border-transparent'}
                  `}
                >
                  <Flame className="w-6 h-6" />
                  <span className="font-bold text-sm">صعب</span>
                  <span className="text-xs opacity-70">45 ثانية</span>
                </button>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-blue-600 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
              <button 
                onClick={startGame}
                className="relative bg-slate-900 ring-1 ring-slate-700 hover:bg-slate-800 text-white text-xl md:text-2xl font-bold py-6 px-16 rounded-full flex items-center gap-4 transition-all"
              >
                <Play className="fill-emerald-500 text-emerald-500 w-6 h-6" />
                ابدأ التحدي
              </button>
            </div>

            {highScore > 0 && (
              <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 px-6 py-3 rounded-xl border border-yellow-500/20">
                <Trophy className="w-5 h-5" />
                <span className="font-bold">أفضل نتيجة: {highScore}</span>
              </div>
            )}
          </div>
        )}

        {/* --- GAMEPLAY SCREEN --- */}
        {/* We keep GameScreen mounted even during validation, the overlay sits on top */}
        {gameState.status === GameStatus.PLAYING && gameState.currentChallenge && (
          <GameScreen 
            challenge={gameState.currentChallenge}
            score={gameState.score}
            timeLeft={gameState.timeLeft}
            onNextRound={handleNextRound}
            onGameOver={() => setGameState(prev => ({ ...prev, status: GameStatus.GAME_OVER }))}
            onValidationChange={setIsValidating}
          />
        )}

        {/* --- GAME OVER SCREEN --- */}
        {gameState.status === GameStatus.GAME_OVER && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 animate-in zoom-in duration-300">
            <div className="bg-slate-800/80 p-8 md:p-12 rounded-3xl border border-slate-700 shadow-2xl backdrop-blur-xl max-w-lg w-full">
              <h2 className="text-4xl font-bold text-white mb-2">انتهى الوقت!</h2>
              <p className="text-slate-400 mb-8">أداء رائع، هل يمكنك تحطيم رقمك؟</p>
              
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="text-sm text-slate-500 uppercase tracking-widest mb-2">النتيجة النهائية</div>
                  <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-emerald-400 to-blue-500">
                    {gameState.score}
                  </div>
                  <div className="mt-2 inline-block px-3 py-1 rounded-full bg-slate-700 text-xs font-mono text-slate-300">
                    {gameState.difficulty} MODE
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 mt-8">
                <button 
                  onClick={startGame}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  لعب مرة أخرى
                </button>
                <button 
                  onClick={resetGame}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-4 rounded-xl transition-colors"
                >
                  القائمة الرئيسية
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
      
      {/* Footer */}
      <footer className="py-4 text-center text-slate-600 text-sm relative z-0">
        <p>مدعوم بواسطة Gemini AI</p>
      </footer>
    </div>
  );
}