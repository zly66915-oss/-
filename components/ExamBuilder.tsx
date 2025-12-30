
import React, { useState, useEffect } from 'react';
import { ExamQuestion } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

interface ExamBuilderProps {
  onStartExam: (questions: ExamQuestion[]) => void;
  initialMode?: 'manual' | 'ai-normal';
}

const ExamBuilder: React.FC<ExamBuilderProps> = ({ onStartExam, initialMode = 'manual' }) => {
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [qType, setQType] = useState<'mcq' | 'written'>('mcq');
  const [currentQ, setCurrentQ] = useState<string>('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState<number>(0);
  const [correctAnswer, setCorrectAnswer] = useState<string>('');
  const [explanation, setExplanation] = useState<string>('');
  
  const [aiPrompt, setAiPrompt] = useState(initialMode === 'ai-normal' ? 'ولد لي مجموعة من الأسئلة العادية والمبسطة حول المنهج الحالي' : '');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(initialMode === 'ai-normal');

  useEffect(() => {
    if (initialMode === 'ai-normal') {
      setShowAiAssistant(true);
      setAiPrompt('ولد لي مجموعة من الأسئلة العادية والمبسطة حول المنهج الحالي');
    } else {
      setShowAiAssistant(false);
      setAiPrompt('');
    }
  }, [initialMode]);

  const handleAddQuestion = () => {
    if (!currentQ) {
      alert("عيني اكتب السؤال أولاً.");
      return;
    }

    let newQuestion: ExamQuestion;

    if (qType === 'mcq') {
      if (options.some(opt => !opt)) {
        alert("املأ كل الخيارات للسؤال بنظام الاختيارات.");
        return;
      }
      newQuestion = {
        question: currentQ,
        type: 'mcq',
        options: [...options],
        correctIndex,
        explanation: explanation || "إجابة صحيحة!"
      };
    } else {
      if (!correctAnswer) {
        alert("اكتب الجواب النموذجي للسؤال العادي.");
        return;
      }
      newQuestion = {
        question: currentQ,
        type: 'written',
        correctAnswer,
        explanation: explanation || "تم التحقق من الإجابة."
      };
    }

    setQuestions([...questions, newQuestion]);
    resetForm();
  };

  const resetForm = () => {
    setCurrentQ('');
    setOptions(['', '', '', '']);
    setCorrectIndex(0);
    setCorrectAnswer('');
    setExplanation('');
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleAiAssistant = async () => {
    if (!aiPrompt) return;
    setIsAiProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `ساعد المستخدم في بناء اختبار. الطلب: ${aiPrompt}. 
        إذا كان الطلب سؤالاً عادياً، ولد أسئلة بدون اختيارات (سؤال وجواب).
        يجب أن يكون الرد JSON كقائمة من الأسئلة بالهيكل المناسب.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                type: { type: Type.STRING, description: "'mcq' or 'written'" },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctIndex: { type: Type.INTEGER },
                correctAnswer: { type: Type.STRING },
                explanation: { type: Type.STRING }
              },
              required: ["question", "type", "explanation"]
            }
          }
        }
      });

      const newAiQuestions = JSON.parse(response.text);
      setQuestions([...questions, ...newAiQuestions]);
      setAiPrompt('');
      if (initialMode !== 'ai-normal') setShowAiAssistant(false);
    } catch (e) {
      alert("فشل المساعد في توليد الأسئلة عيني.");
    } finally {
      setIsAiProcessing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-1 rounded-[2.5rem] shadow-xl">
        <div className="bg-white p-8 rounded-[2.4rem] space-y-6">
          <div className="flex justify-between items-center">
             <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                  <i className="fa-solid fa-wand-magic-sparkles"></i>
                </div>
                {initialMode === 'ai-normal' ? 'منشئ الأسئلة العادية بالذكاء' : 'مساعد الأسئلة الذكي'}
             </h3>
             <button 
               onClick={() => setShowAiAssistant(!showAiAssistant)}
               className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${showAiAssistant ? 'bg-slate-100 text-slate-500' : 'bg-orange-600 text-white shadow-lg shadow-orange-200'}`}
             >
               {showAiAssistant ? 'إغلاق المساعد' : 'توليد ذكي'}
             </button>
          </div>

          {showAiAssistant && (
            <div className="space-y-4 animate-in slide-in-from-top-4">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="مثلاً: 'اكتب لي 5 أسئلة عادية (سؤال وجواب) عن مادة الأحياء الفصل الأول'..."
                className="w-full p-4 bg-orange-50/50 border-2 border-orange-100 focus:border-orange-500 rounded-2xl outline-none transition-all h-28 text-sm font-medium"
              />
              <button
                onClick={handleAiAssistant}
                disabled={isAiProcessing || !aiPrompt}
                className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-orange-700 disabled:opacity-50 shadow-lg shadow-orange-100"
              >
                {isAiProcessing ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-bolt-lightning"></i>}
                توليد وإضافة للمسودة
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center">
              <i className="fa-solid fa-pen-to-square"></i>
            </div>
            إضافة سؤال يدوياً
          </h3>
          <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto">
            <button 
                onClick={() => setQType('mcq')} 
                className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-xs font-black transition-all ${qType === 'mcq' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
            >
                نظام اختيارات
            </button>
            <button 
                onClick={() => setQType('written')} 
                className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-xs font-black transition-all ${qType === 'written' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
            >
                سؤال عادي (مقالي)
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">نص السؤال</label>
            <textarea
                value={currentQ}
                onChange={(e) => setCurrentQ(e.target.value)}
                placeholder={qType === 'mcq' ? "اكتب سؤال الاختيارات هنا..." : "اكتب السؤال العادي هنا (مثال: ما هي وظيفة القلب؟)..."}
                className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-3xl outline-none transition-all h-28 font-bold text-slate-800"
            />
          </div>

          {qType === 'mcq' ? (
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">خيارات الإجابة (اختر الصحيحة)</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {options.map((opt, idx) => (
                    <div key={idx} className="relative">
                    <input
                        value={opt}
                        onChange={(e) => {
                        const newOpts = [...options];
                        newOpts[idx] = e.target.value;
                        setOptions(newOpts);
                        }}
                        placeholder={`الخيار ${idx + 1}`}
                        className={`w-full p-4 pr-12 bg-slate-50 border-2 rounded-2xl outline-none transition-all ${correctIndex === idx ? 'border-green-500 bg-green-50/30' : 'border-transparent focus:border-slate-200'}`}
                    />
                    <button
                        type="button"
                        onClick={() => setCorrectIndex(idx)}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${correctIndex === idx ? 'bg-green-500 border-green-500 text-white' : 'border-slate-200 text-slate-300'}`}
                    >
                        {correctIndex === idx ? <i className="fa-solid fa-check text-xs"></i> : <span className="text-xs">{idx + 1}</span>}
                    </button>
                    </div>
                ))}
                </div>
            </div>
          ) : (
            <div className="space-y-2">
                <label className="text-[10px] font-black text-green-600 uppercase tracking-widest px-2">الجواب النموذجي</label>
                <textarea
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    placeholder="اكتب الجواب الذي سيظهر للطالب عند المراجعة..."
                    className="w-full p-5 bg-green-50/30 border-2 border-transparent focus:border-green-500 rounded-3xl outline-none transition-all h-28 font-bold italic text-green-800"
                />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">توضيح تربوي (اختياري)</label>
            <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="أضف شرحاً بسيطاً يساعد الطالب على الفهم..."
                className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all h-20 text-xs font-medium"
            />
          </div>

          <button
            onClick={handleAddQuestion}
            className="w-full py-5 bg-slate-900 text-white rounded-[1.8rem] font-black hover:bg-black transition-all flex items-center justify-center gap-3 shadow-lg"
          >
            <i className="fa-solid fa-plus-circle"></i> تثبيت السؤال في القائمة
          </button>
        </div>
      </div>

      {questions.length > 0 && (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <div>
              <h3 className="text-xl font-black text-slate-800 text-center md:text-right">مسودة الاختبار</h3>
              <p className="text-xs text-slate-400 font-bold text-center md:text-right">لديك {questions.length} أسئلة جاهزة</p>
            </div>
            <button
              onClick={() => onStartExam(questions)}
              className="w-full md:w-auto px-10 py-4 bg-blue-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-95"
            >
              <i className="fa-solid fa-play"></i> بدء الاختبار
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {questions.map((q, i) => (
              <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group hover:bg-white hover:shadow-md transition-all">
                <div className="flex items-center gap-4 overflow-hidden">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shadow-sm shrink-0 ${q.type === 'written' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>{i + 1}</span>
                  <div className="overflow-hidden">
                    <p className="font-bold text-slate-700 truncate">{q.question}</p>
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{q.type === 'written' ? 'سؤال عادي' : 'اختيارات'}</p>
                  </div>
                </div>
                <button onClick={() => removeQuestion(i)} className="text-slate-300 hover:text-red-500 transition-colors p-2 shrink-0">
                  <i className="fa-solid fa-trash-can"></i>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamBuilder;
