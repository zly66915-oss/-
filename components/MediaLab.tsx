
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";

const MediaLab: React.FC<{ curriculumContent: string }> = ({ curriculumContent }) => {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [resultVideo, setResultVideo] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  const generateImage = async () => {
    setGenerating(true);
    setStatus('جاري رسم المفهوم...');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [{ text: `Create a professional educational illustration about: ${prompt}. Context: ${curriculumContent}` }],
        config: { imageConfig: { aspectRatio: "1:1" } }
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          setResultImage(`data:image/png;base64,${part.inlineData.data}`);
          setResultVideo(null);
        }
      }
    } catch (e) {
      alert("حدث خطأ في توليد الصورة");
    } finally {
      setGenerating(false);
    }
  };

  const generateVideo = async () => {
    if (!window.aistudio?.hasSelectedApiKey()) {
        await window.aistudio?.openSelectKey();
    }
    setGenerating(true);
    setStatus('جاري إنتاج فيديو تعليمي (قد يستغرق دقيقة)...');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `Educational animation showing: ${prompt}`,
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
      });

      while (!operation.done) {
        await new Promise(r => setTimeout(r, 5000));
        operation = await ai.operations.getVideosOperation({ operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      const blob = await response.blob();
      setResultVideo(URL.createObjectURL(blob));
      setResultImage(null);
    } catch (e) {
      alert("خطأ في إنتاج الفيديو. تأكد من تفعيل الدفع في API Key");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-purple-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-purple-100">
          <i className="fa-solid fa-wand-magic-sparkles"></i>
        </div>
        <h3 className="text-xl font-bold text-slate-800">مختبر الوسائط الذكي</h3>
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="صف المفهوم الذي تريد تحويله لصورة أو فيديو... (مثال: شرح دورة حياة الخلية)"
        className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-2xl outline-none text-sm transition-all h-24"
      />

      <div className="flex gap-3">
        <button 
          onClick={generateImage}
          disabled={generating || !prompt}
          className="flex-1 py-4 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-image"></i> توليد صورة
        </button>
        <button 
          onClick={generateVideo}
          disabled={generating || !prompt}
          className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-video"></i> توليد فيديو
        </button>
      </div>

      {generating && (
        <div className="flex flex-col items-center justify-center py-10 animate-pulse">
          <div className="w-12 h-12 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin mb-4"></div>
          <p className="text-sm text-purple-600 font-bold">{status}</p>
        </div>
      )}

      {resultImage && (
        <div className="rounded-3xl overflow-hidden border-4 border-white shadow-2xl animate-in zoom-in-95">
          <img src={resultImage} alt="Generated" className="w-full" />
          <a href={resultImage} download="study-asset.png" className="block p-3 bg-slate-50 text-center text-xs font-bold text-slate-500 hover:bg-slate-100">حفظ الصورة</a>
        </div>
      )}

      {resultVideo && (
        <div className="rounded-3xl overflow-hidden border-4 border-white shadow-2xl animate-in zoom-in-95">
          <video src={resultVideo} controls className="w-full" autoPlay />
          <p className="p-3 text-center text-xs text-slate-400 font-bold">فيديو تعليمي مولد بذكاء Veo</p>
        </div>
      )}
    </div>
  );
};

export default MediaLab;
