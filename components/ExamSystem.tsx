
import React, { useState } from 'react';
import { ExamQuestion } from '../types';

interface ExamSystemProps {
  questions: ExamQuestion[];
  onComplete: (score: number) => void;
  onClose: () => void;
  title: string;
}

interface UserAnswerSummary {
  question: ExamQuestion;
  userSelected?: number;
  userText?: string;
  isCorrect: boolean;
}

const ExamSystem: React.FC<ExamSystemProps> = ({ questions, onComplete, onClose, title }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [writtenAnswer, setWrittenAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [history, setHistory] = useState<UserAnswerSummary[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'missed'>('all');

  if (!questions || questions.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-[3rem] text-center shadow-2xl">
          <p className="font-black text-slate-800 mb-6">عذراً، لا توجد أسئلة متوفرة حالياً.</p>
          <button onClick={onClose} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black">إغلاق</button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  const handleMCQAnswer = (index: number) => {
    if (showFeedback) return;
    setSelectedOption(index);
    const isCorrect = index === currentQ.correctIndex;
    if (isCorrect) setScore(prev => prev + 1);
    
    setHistory(prev => [...prev, {
      question: currentQ,
      userSelected: index,
      isCorrect
    }]);
    
    setShowFeedback(true);
  };

  const handleWrittenSubmit = () => {
    if (showFeedback || !writtenAnswer.trim()) return;
    // الأسئلة العادية يتم تقييمها بأنها تحتاج مراجعة في الملخص
    setHistory(prev => [...prev, {
      question: currentQ,
      userText: writtenAnswer,
      isCorrect: true 
    }]);
    setScore(prev => prev + 1);
    setShowFeedback(true);
  };

  const nextQuestion = () => {
    setShowFeedback(false);
    setSelectedOption(null);
    setWrittenAnswer('');
    if (currentIndex < questions.length - 1) setCurrentIndex(prev => prev + 1);
    else setIsFinished(true);
  };

  if (isFinished) {
    const percentage = Math.round((score / questions.length) * 100);
    const displayedHistory = filterType === 'all' ? history : history.filter(h => !h.isCorrect || h.question.type === 'written');

    return (
      <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 md:p-10 animate-in fade-in">
        <div className="bg-white w-full max-w-4xl rounded-[3rem] p-6 md:p-10 text-center shadow-2xl space-y-8 flex flex-col max-h-[95vh]">
          <div className="shrink-0 space-y-4">
            <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-[2rem] flex items-center justify-center mx-auto text-3xl shadow-lg">
              <i className="fa-solid fa-trophy"></i>
            </div>
            <h2 className="text-3xl font-black text-slate-800">تقرير الأداء النهائي</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50/50 p-4 rounded-[1.8rem] border border-blue-100">
                <p className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">معدل النجاح</p>
                <p className="text-4xl font-black text-blue-600">{percentage}%</p>
              </div>
              <div className="bg-green-50/50 p-4 rounded-[1.8rem] border border-green-100">
                <p className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">الإجابات الصحيحة</p>
                <p className="text-4xl font-black text-green-600">{score}/{questions.length}</p>
              </div>
              <div className="bg-orange-50/50 p-4 rounded-[1.8rem] border border-orange-100">
                <p className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">توقيت الاختبار</p>
                <p className="text-4xl font-black text-orange-600">منجز</p>
              </div>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-2xl max-w-sm mx-auto">
                <button 
                    onClick={() => setFilterType('all')} 
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all ${filterType === 'all' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'}`}
                >
                    كل الأسئلة
                </button>
                <button 
                    onClick={() => setFilterType('missed')} 
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all ${filterType === 'missed' ? 'bg-white text-red-600 shadow-md' : 'text-slate-500'}`}
                >
                    الأخطاء فقط
                </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6 text-right">
            {displayedHistory.length === 0 ? (
                <div className="py-20 text-center opacity-30">
                    <i className="fa-solid fa-face-smile text-6xl mb-4"></i>
                    <p className="font-black">لا توجد أخطاء للمراجعة، أنت مذهل!</p>
                </div>
            ) : displayedHistory.map((h, idx) => (
              <div key={idx} className={`rounded-[2.5rem] p-6 md:p-8 border-2 transition-all ${h.isCorrect ? 'bg-white border-slate-100' : 'bg-red-50/20 border-red-100'}`}>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${h.question.type === 'written' ? 'bg-orange-100 text-orange-600' : h.isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {h.question.type === 'written' ? 'سؤال مقالي' : h.isCorrect ? 'صحيحة ✅' : 'إجابة خاطئة ❌'}
                    </span>
                  </div>
                  <span className="text-slate-200 font-black text-2xl italic opacity-50">#{history.indexOf(h) + 1}</span>
                </div>
                
                <p className="font-black text-slate-800 text-lg md:text-xl leading-relaxed mb-6">{h.question.question}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {h.question.type === 'mcq' ? (
                    <>
                      <div className={`p-4 rounded-2xl border ${h.isCorrect ? 'bg-green-50/50 border-green-100 text-green-800' : 'bg-red-50/50 border-red-100 text-red-800'}`}>
                        <p className="text-[9px] font-black opacity-50 mb-1 uppercase tracking-widest">إجابتك</p>
                        <p className="font-bold text-sm">{h.question.options![h.userSelected!]}</p>
                      </div>
                      {!h.isCorrect && (
                        <div className="p-4 rounded-2xl border bg-green-50/50 border-green-100 text-green-800">
                          <p className="text-[9px] font-black opacity-50 mb-1 uppercase tracking-widest">الجواب الصحيح</p>
                          <p className="font-bold text-sm">{h.question.options![h.question.correctIndex!]}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="p-4 rounded-2xl border bg-slate-50 border-slate-100">
                        <p className="text-[9px] font-black opacity-50 mb-1 uppercase tracking-widest">إجابتك المكتوبة</p>
                        <p className="font-bold text-sm text-slate-700">{h.userText}</p>
                      </div>
                      <div className="p-4 rounded-2xl border bg-green-50/50 border-green-100 text-green-800">
                        <p className="text-[9px] font-black opacity-50 mb-1 uppercase tracking-widest">الجواب النموذجي</p>
                        <p className="font-bold text-sm">{h.question.correctAnswer}</p>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="mt-6 p-5 bg-blue-50/30 rounded-[1.8rem] border border-dashed border-blue-200">
                  <div className="flex items-center gap-2 mb-2 text-blue-600">
                    <i className="fa-solid fa-lightbulb text-sm"></i>
                    <p className="text-[10px] font-black uppercase tracking-widest">توضيح المعلم</p>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium italic">{h.question.explanation}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="shrink-0 pt-4 border-t flex gap-4">
             <button 
                onClick={() => { setIsFinished(false); setCurrentIndex(0); setScore(0); setHistory([]); }}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all active:scale-95"
              >
                إعادة الاختبار
              </button>
              <button 
                onClick={() => onComplete(percentage)} 
                className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all"
              >
                حفظ العودة للمواد
              </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        <div className="bg-slate-50 px-8 py-6 border-b flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-black text-slate-800 text-lg">{title}</h3>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${currentQ.type === 'written' ? 'bg-orange-500' : 'bg-blue-500'}`}></span>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">سؤال {currentIndex + 1} من {questions.length}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 rounded-2xl hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>
        
        <div className="h-1.5 w-full bg-slate-100 shrink-0">
          <div className="h-full bg-blue-500 transition-all duration-700 ease-out" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}></div>
        </div>

        <div className="p-6 md:p-10 overflow-y-auto space-y-8 custom-scrollbar">
          <div className="bg-slate-50/80 p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-inner">
            <h4 className="text-xl md:text-2xl font-black text-slate-800 leading-relaxed text-right">{currentQ.question}</h4>
          </div>

          {currentQ.type === 'mcq' ? (
            <div className="grid grid-cols-1 gap-3">
              {currentQ.options!.map((option, idx) => (
                <button 
                  key={idx} 
                  onClick={() => handleMCQAnswer(idx)} 
                  disabled={showFeedback} 
                  className={`p-6 rounded-[1.8rem] text-right font-bold transition-all border-2 flex items-center justify-between group ${
                    showFeedback 
                      ? idx === currentQ.correctIndex 
                        ? 'bg-green-50 border-green-500 text-green-700 shadow-lg shadow-green-100 scale-[1.02]' 
                        : idx === selectedOption 
                          ? 'bg-red-50 border-red-500 text-red-700 opacity-80' 
                          : 'bg-white border-slate-100 opacity-40' 
                      : 'bg-white border-slate-100 hover:border-blue-300 hover:bg-blue-50/20 active:scale-[0.98]'
                  }`}
                >
                  <span className="flex-1 text-base">{option}</span>
                  <div className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center shrink-0 mr-4 transition-all ${
                    showFeedback && idx === currentQ.correctIndex 
                      ? 'bg-green-500 border-green-500 text-white shadow-lg' 
                      : 'border-slate-100 group-hover:border-blue-200 text-slate-300'
                  }`}>
                    {showFeedback && idx === currentQ.correctIndex ? (
                      <i className="fa-solid fa-check"></i>
                    ) : (
                      <span className="text-[10px] font-black">{idx + 1}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <textarea
                value={writtenAnswer}
                onChange={(e) => setWrittenAnswer(e.target.value)}
                disabled={showFeedback}
                placeholder="اكتب إجابتك النموذجية هنا..."
                className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-[2.5rem] outline-none transition-all h-48 font-black text-slate-800 leading-relaxed text-lg"
              />
              {!showFeedback && (
                <button 
                  onClick={handleWrittenSubmit}
                  disabled={!writtenAnswer.trim()}
                  className="w-full py-5 bg-blue-600 text-white rounded-[1.8rem] font-black shadow-xl hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <i className="fa-solid fa-paper-plane"></i> إرسال الإجابة للمراجعة
                </button>
              )}
            </div>
          )}

          {showFeedback && (
            <div className="animate-in slide-in-from-top-6 duration-700 p-8 bg-slate-900 text-white rounded-[3rem] shadow-2xl space-y-6">
               <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${currentQ.type === 'written' ? 'bg-orange-500 shadow-orange-500/20' : selectedOption === currentQ.correctIndex ? 'bg-green-500 shadow-green-500/20' : 'bg-red-500 shadow-red-500/20 shadow-lg'}`}>
                    <i className={`fa-solid ${currentQ.type === 'written' ? 'fa-circle-info' : selectedOption === currentQ.correctIndex ? 'fa-check-double' : 'fa-xmark'}`}></i>
                  </div>
                  <div>
                    <h5 className="text-xl font-black">
                        {currentQ.type === 'written' ? 'تم استلام إجابتك' : selectedOption === currentQ.correctIndex ? 'إجابة عبقرية!' : 'تعلم من هذه التجربة'}
                    </h5>
                    <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">{currentQ.type === 'written' ? 'راجع الجواب النموذجي أدناه' : 'لاحظ التوضيح التعليمي التالي'}</p>
                  </div>
               </div>
               
               {currentQ.type === 'written' && (
                 <div className="bg-white/5 p-6 rounded-2xl border border-white/10 shadow-inner">
                    <p className="text-[9px] text-green-400 font-black mb-2 uppercase tracking-widest">الجواب النموذجي للمقارنة:</p>
                    <p className="text-base font-bold text-white leading-relaxed">{currentQ.correctAnswer}</p>
                 </div>
               )}

               <div className="bg-white/5 p-6 rounded-2xl border border-dashed border-white/10">
                 <p className="text-[9px] text-blue-400 font-black mb-2 uppercase tracking-widest">تحليل المعلم الذكي:</p>
                 <p className="text-sm text-white/70 leading-relaxed font-medium">{currentQ.explanation}</p>
               </div>

               <button 
                 onClick={nextQuestion} 
                 className="w-full py-5 bg-white text-slate-900 rounded-[1.8rem] font-black flex items-center justify-center gap-3 hover:bg-blue-50 transition-all active:scale-95 shadow-2xl text-lg"
               >
                 {currentIndex < questions.length - 1 ? 'الانتقال للسؤال التالي' : 'إنهاء الاختبار وعرض التقرير'}
                 <i className="fa-solid fa-chevron-left"></i>
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamSystem;
