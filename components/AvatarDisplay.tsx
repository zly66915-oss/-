
import React from 'react';
import { TutorGender } from '../types';

interface AvatarDisplayProps {
  gender: TutorGender;
  isActive: boolean;
  isSpeaking: boolean;
  onGenderChange: (gender: TutorGender) => void;
}

const AvatarDisplay: React.FC<AvatarDisplayProps> = ({ gender, isActive, isSpeaking, onGenderChange }) => {
  const avatarUrl = gender === TutorGender.MALE 
    ? 'https://picsum.photos/seed/male-tutor/400/400' 
    : 'https://picsum.photos/seed/female-tutor/400/400';

  return (
    <div className="flex flex-col items-center gap-6 p-8 glass rounded-3xl shadow-xl transition-all duration-500">
      <div className="relative group">
        <div className={`w-48 h-48 rounded-full overflow-hidden border-4 transition-all duration-500 ${isActive ? 'border-blue-500 shadow-2xl' : 'border-gray-200'} ${isSpeaking ? 'pulse-animation' : ''}`}>
          <img 
            src={avatarUrl} 
            alt="AI Tutor" 
            className="w-full h-full object-cover"
          />
        </div>
        
        {isActive && (
          <div className="absolute -bottom-2 -right-2 bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center border-2 border-white">
            <i className="fa-solid fa-microphone text-xs"></i>
          </div>
        )}
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-1">
          {gender === TutorGender.MALE ? 'الأستاذ أحمد' : 'الأستاذة سارة'}
        </h2>
        <p className="text-slate-500 text-sm">مساعدك التعليمي الذكي</p>
      </div>

      <div className="flex gap-2 bg-slate-100 p-1 rounded-full">
        <button
          onClick={() => onGenderChange(TutorGender.FEMALE)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${gender === TutorGender.FEMALE ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          أستاذة (أنثى)
        </button>
        <button
          onClick={() => onGenderChange(TutorGender.MALE)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${gender === TutorGender.MALE ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          أستاذ (ذكر)
        </button>
      </div>
    </div>
  );
};

export default AvatarDisplay;
