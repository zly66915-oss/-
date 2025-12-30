
import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";

interface CurriculumInputProps {
  onAdd: (title: string, content: string) => void;
}

const CurriculumInput: React.FC<CurriculumInputProps> = ({ onAdd }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processStep, setProcessStep] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title && content) {
      onAdd(title, content);
      resetState();
    }
  };

  const resetState = () => {
    setTitle('');
    setContent('');
    setIsOpen(false);
    setIsProcessing(false);
    setUploadProgress(0);
    setProcessStep('');
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onprogress = (data) => {
        if (data.lengthComputable) {                                            
          setUploadProgress(Math.round((data.loaded / data.total) * 100));
        }
      };
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Warning for very large files (> 20MB for inlineData limits)
    if (file.size > 20 * 1024 * 1024) {
      alert("الملف كبير جداً. يرجى محاولة رفع أجزاء أصغر لضمان أفضل جودة في الاستخراج.");
      return;
    }

    setIsProcessing(true);
    setIsOpen(true);
    setProcessStep('جاري قراءة الملف...');

    try {
      const base64Data = await fileToBase64(file);
      setProcessStep('جاري تحليل المحتوى بالذكاء الاصطناعي...');
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: file.type || "application/pdf",
                },
              },
              {
                text: "Analyze this large educational document. 1. Create a professional Title. 2. Extract and summarize all core educational concepts, chapters, and key details in Arabic. 3. Ensure the output is structured for a tutor to teach from. Format: TITLE: [title] CONTENT: [detailed structured content]",
              },
            ],
          },
        ],
      });

      const resultText = response.text || "";
      const titleMatch = resultText.match(/TITLE:\s*(.*)/);
      const contentMatch = resultText.match(/CONTENT:\s*([\s\S]*)/);

      if (titleMatch && titleMatch[1]) setTitle(titleMatch[1].trim());
      else setTitle(file.name.split('.')[0]);

      if (contentMatch && contentMatch[1]) setContent(contentMatch[1].trim());
      else setContent(resultText);

      setProcessStep('اكتمل التحليل بنجاح!');
    } catch (error) {
      console.error("Error processing file:", error);
      alert("حدث خطأ أثناء معالجة الملف الضخم. تأكد من أن الملف نصي أو صورة واضحة.");
      resetState();
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {!isOpen ? (
        <div 
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) {
              const dt = new DataTransfer();
              dt.items.add(file);
              if (fileInputRef.current) {
                fileInputRef.current.files = dt.files;
                handleFileUpload({ target: fileInputRef.current } as any);
              }
            }
          }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <button 
            onClick={() => setIsOpen(true)}
            className="p-8 bg-white border-2 border-dashed border-blue-200 rounded-[2rem] text-blue-600 hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-3 font-bold group shadow-sm hover:shadow-md"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-keyboard text-xl"></i>
            </div>
            <span>إضافة نص يدوياً</span>
          </button>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-8 bg-white border-2 border-dashed border-indigo-200 rounded-[2rem] text-indigo-600 hover:bg-indigo-50 transition-all flex flex-col items-center justify-center gap-3 font-bold group shadow-sm hover:shadow-md relative overflow-hidden"
          >
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-file-pdf text-xl"></i>
            </div>
            <span>رفع كتاب / ملف ضخم</span>
            <div className="text-[10px] text-indigo-400 font-normal mt-1 italic">يدعم PDF والصور والمستندات</div>
          </button>

          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".pdf,image/*,.txt,.doc,.docx"
            onChange={handleFileUpload}
          />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2.5rem] shadow-2xl space-y-6 border border-slate-100 animate-in zoom-in-95 duration-300 relative overflow-hidden">
          
          {isProcessing && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-8 text-center">
              <div className="relative mb-6">
                 <div className="w-20 h-20 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                 <div className="absolute inset-0 flex items-center justify-center font-bold text-blue-600 text-sm">
                    {uploadProgress}%
                 </div>
              </div>
              <h4 className="text-xl font-bold text-slate-800 mb-2">جاري تجهيز منهجك</h4>
              <p className="text-slate-500 text-sm animate-pulse">{processStep}</p>
              
              <div className="w-full max-w-xs bg-slate-100 h-1.5 rounded-full mt-6 overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-500 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                <i className="fa-solid fa-file-signature"></i>
              </div>
              <h3 className="text-xl font-bold text-slate-800">تجهيز المادة الدراسية</h3>
            </div>
            <button 
              type="button" 
              onClick={resetState}
              className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">عنوان المادة</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="أدخل عنواناً للمادة هنا..."
                className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl focus:outline-none transition-all font-bold text-slate-800"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2 px-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">المحتوى التعليمي المستخلص</label>
                {content && <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">تحليل ذكي</span>}
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="الصق النص هنا أو انتظر التحليل..."
                rows={8}
                className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl focus:outline-none resize-none transition-all text-sm leading-relaxed text-slate-700"
                required
              ></textarea>
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <button 
              type="submit"
              disabled={isProcessing || !title || !content}
              className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all disabled:bg-slate-200 disabled:cursor-not-allowed shadow-xl shadow-blue-200 active:scale-95"
            >
              <i className="fa-solid fa-check-double ml-2"></i>
              حفظ المادة في المكتبة
            </button>
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-14 h-14 bg-slate-100 text-slate-500 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center justify-center border-2 border-transparent hover:border-indigo-100"
              title="إرفاق ملف آخر"
            >
              <i className="fa-solid fa-paperclip text-xl"></i>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CurriculumInput;
