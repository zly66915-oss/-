
import React, { useEffect, useRef } from 'react';
import { TutorGender } from '../types';

interface VideoCallOverlayProps {
  gender: TutorGender;
  isSpeaking: boolean;
  isThinking: boolean;
  userStream: MediaStream | null;
  onClose: () => void;
  isSessionActive: boolean;
  isReconnecting?: boolean;
}

const VideoCallOverlay: React.FC<VideoCallOverlayProps> = ({ gender, isSpeaking, isThinking, userStream, onClose, isSessionActive, isReconnecting }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const tutorAvatar = gender === TutorGender.MALE 
    ? 'https://picsum.photos/seed/male-tutor-high/800/800' 
    : 'https://picsum.photos/seed/female-tutor-high/800/800';

  useEffect(() => {
    if (videoRef.current && userStream) {
      videoRef.current.srcObject = userStream;
      videoRef.current.play().catch(console.error);
    }
  }, [userStream]);

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col animate-in fade-in duration-500 overflow-hidden">
      {isReconnecting && (
        <div className="absolute inset-0 z-[300] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center text-white p-8">
          <div className="w-16 h-16 border-4 border-t-blue-500 rounded-full animate-spin mb-6"></div>
          <h2 className="text-3xl font-black mb-2">جاري استعادة البث..</h2>
          <p className="opacity-70 font-bold">يرجى البقاء في مكانك، المعلم يحاول العودة.</p>
        </div>
      )}

      <div className="absolute top-0 left-0 right-0 p-8 flex justify-between items-center z-50 bg-gradient-to-b from-black/80">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className={`w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white transition-all ${isSpeaking ? 'scale-110 shadow-xl' : ''}`}>
              <i className={`fa-solid ${isThinking ? 'fa-brain animate-pulse' : 'fa-video'}`}></i>
            </div>
            {isSessionActive && <span className="absolute -top-1 -right-1 flex h-4 w-4"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span></span>}
          </div>
          <div>
            <h2 className="text-white font-black text-2xl tracking-tight">درس مباشر</h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest">مستقر</p>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-2xl font-black transition-all active:scale-95 shadow-xl shadow-red-900/40">إنهاء الدرس</button>
      </div>

      <div className="flex-1 relative flex items-center justify-center p-6">
        <div className="w-full h-full max-w-5xl max-h-[80vh] rounded-[4rem] overflow-hidden relative bg-slate-900 shadow-2xl border border-white/5 group">
          <img 
            src={tutorAvatar} 
            alt="AI Tutor" 
            className={`w-full h-full object-cover transition-all duration-1000 ${isSpeaking ? 'scale-110 brightness-110' : 'scale-100 brightness-75'} ${isThinking ? 'blur-[2px]' : ''}`} 
          />
          
          {isThinking && (
            <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm bg-black/20 transition-all">
              <div className="w-20 h-20 border-4 border-slate-100/20 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          )}

          {isSpeaking && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-end gap-2 h-24 z-10">
              {[...Array(15)].map((_, i) => (
                <div 
                  key={i} 
                  className="w-1.5 bg-blue-500 rounded-full animate-bounce shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
                  style={{ animationDelay: `${i * 0.04}s`, height: `${30 + Math.random() * 70}%` }}
                ></div>
              ))}
            </div>
          )}

          <div className="absolute bottom-10 left-12 bg-white/5 backdrop-blur-2xl px-8 py-5 rounded-[2.5rem] border border-white/10 shadow-2xl">
            <p className="text-white font-black text-2xl mb-1">{gender === TutorGender.MALE ? 'أ. أحمد' : 'أ. سارة'}</p>
            <div className="flex items-center gap-2 opacity-60">
              <i className="fa-solid fa-signal text-[10px] text-green-500"></i>
              <p className="text-white text-[9px] font-bold uppercase tracking-tighter">بث مباشر - جودة عالية</p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-12 right-12 w-56 md:w-72 aspect-[4/5] bg-slate-900 rounded-[3rem] overflow-hidden border-8 border-white/5 shadow-2xl z-20 transition-all hover:scale-105 group ring-1 ring-white/10">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover mirror" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <p className="absolute bottom-4 left-0 right-0 text-center text-white/50 text-[10px] font-black uppercase tracking-widest">أنت</p>
        </div>
      </div>
      <style>{`.mirror { transform: scaleX(-1); }`}</style>
    </div>
  );
};

export default VideoCallOverlay;
