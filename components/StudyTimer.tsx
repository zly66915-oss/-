
import React, { useState, useEffect, useCallback } from 'react';

interface StudyTimerProps {
  onPhaseChange: (isBreak: boolean) => void;
}

const StudyTimer: React.FC<StudyTimerProps> = ({ onPhaseChange }) => {
  const STUDY_TIME = 25 * 60;
  const BREAK_TIME = 5 * 60;

  const [timeLeft, setTimeLeft] = useState(STUDY_TIME);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);

  const toggleTimer = () => {
    setIsActive(!isActive);
    if ('vibrate' in navigator) navigator.vibrate(50);
  };

  const resetTimer = () => {
    setIsActive(false);
    setIsBreak(false);
    setTimeLeft(STUDY_TIME);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    let interval: number | undefined;

    if (isActive && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      const nextIsBreak = !isBreak;
      setIsBreak(nextIsBreak);
      setTimeLeft(nextIsBreak ? BREAK_TIME : STUDY_TIME);
      onPhaseChange(nextIsBreak);
      
      // Play a subtle notification sound if possible
      try {
        const audio = new Audio('https://actions.google.com/sounds/v1/notifications/done.ogg');
        audio.play();
      } catch (e) {}
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft, isBreak, onPhaseChange]);

  const progress = isBreak 
    ? ((BREAK_TIME - timeLeft) / BREAK_TIME) * 100 
    : ((STUDY_TIME - timeLeft) / STUDY_TIME) * 100;

  return (
    <div className="glass rounded-[2.5rem] p-6 shadow-lg border border-slate-200/30 space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <i className={`fa-solid fa-hourglass-half ${isActive ? 'animate-spin' : ''} ${isBreak ? 'text-orange-500' : 'text-blue-500'}`}></i>
          {isBreak ? 'وقت الاستراحة' : 'وقت التركيز'}
        </h3>
        <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${isBreak ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
          25 / 5 دقائق
        </div>
      </div>

      <div className="relative flex items-center justify-center py-4">
        {/* Simple Circular Progress Simulation with SVG */}
        <svg className="w-32 h-32 transform -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="58"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-slate-100"
          />
          <circle
            cx="64"
            cy="64"
            r="58"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={2 * Math.PI * 58}
            strokeDashoffset={2 * Math.PI * 58 * (1 - progress / 100)}
            strokeLinecap="round"
            className={`transition-all duration-1000 ${isBreak ? 'text-orange-500' : 'text-blue-500'}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-slate-800">{formatTime(timeLeft)}</span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">متبقي</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={toggleTimer}
          className={`flex-1 py-3 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 ${isActive ? 'bg-slate-100 text-slate-600' : isBreak ? 'bg-orange-600 text-white' : 'bg-blue-600 text-white'}`}
        >
          <i className={`fa-solid ${isActive ? 'fa-pause' : 'fa-play'}`}></i>
          {isActive ? 'إيقاف مؤقت' : isBreak ? 'بدء الاستراحة' : 'ابدأ التركيز'}
        </button>
        <button
          onClick={resetTimer}
          className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-100 transition-all active:scale-90"
          title="إعادة ضبط"
        >
          <i className="fa-solid fa-rotate-right"></i>
        </button>
      </div>
    </div>
  );
};

export default StudyTimer;
