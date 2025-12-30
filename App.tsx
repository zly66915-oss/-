
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import { TutorGender, Curriculum, Message, SearchSource, ExamQuestion, SmartNotification, SubscriptionStatus } from './types';
import { decode, decodeAudioData, createPcmBlob } from './utils/audioUtils';
import AvatarDisplay from './components/AvatarDisplay';
import CurriculumInput from './components/CurriculumInput';
import MediaLab from './components/MediaLab';
import ExamSystem from './components/ExamSystem';
import ExamBuilder from './components/ExamBuilder';
import VideoCallOverlay from './components/VideoCallOverlay';
import StudyTimer from './components/StudyTimer';
import SubscriptionWall from './components/SubscriptionWall';

const VISION_FRAME_RATE = 0.8; 
const VISION_CAPTURE_INTERVAL = 1000 / VISION_FRAME_RATE;
const VISION_IMAGE_QUALITY = 0.25; 
const VISION_TARGET_WIDTH = 300; 
const MAX_RECONNECT_ATTEMPTS = 6;
const STALL_CHECK_INTERVAL = 120000;
const AUDIO_SAFETY_MARGIN = 0.35; 
const TRIAL_DAYS = 3;

const App: React.FC = () => {
  const [gender, setGender] = useState<TutorGender>(TutorGender.FEMALE);
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [activeCurriculum, setActiveCurriculum] = useState<Curriculum | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tutor' | 'lab' | 'search' | 'exam'>('tutor');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Subscription State
  const [subStatus, setSubStatus] = useState<SubscriptionStatus>(SubscriptionStatus.TRIAL);
  const [trialDaysLeft, setTrialDaysLeft] = useState(TRIAL_DAYS);
  const [showPayWall, setShowPayWall] = useState(false);

  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
  const [showExamOverlay, setShowExamOverlay] = useState(false);
  const [examMode, setExamMode] = useState<'auto' | 'comprehensive' | 'ai-normal' | 'manual'>('auto');
  const [isGeneratingExam, setIsGeneratingExam] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [notifications, setNotifications] = useState<SmartNotification[]>([]);

  const [showVideoCall, setShowVideoCall] = useState(false);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);

  const processingCanvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const isProcessingFrame = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const reconnectAttempts = useRef(0);
  const lastActivityRef = useRef<number>(Date.now());
  const currentTranscriptionRef = useRef<string>("");

  // Initialize and check subscription
  useEffect(() => {
    const checkSub = () => {
      const isSubscribed = localStorage.getItem('moallem_is_subscribed') === 'true';
      if (isSubscribed) {
        setSubStatus(SubscriptionStatus.ACTIVE);
        return;
      }

      let trialStart = localStorage.getItem('moallem_trial_start');
      if (!trialStart) {
        trialStart = Date.now().toString();
        localStorage.setItem('moallem_trial_start', trialStart);
      }

      const startTime = parseInt(trialStart);
      const elapsedMs = Date.now() - startTime;
      const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
      const remaining = Math.max(0, Math.ceil(TRIAL_DAYS - elapsedDays));

      setTrialDaysLeft(remaining);
      if (remaining <= 0) {
        setSubStatus(SubscriptionStatus.EXPIRED);
        setShowPayWall(true);
      } else {
        setSubStatus(SubscriptionStatus.TRIAL);
      }
    };

    checkSub();
    const interval = setInterval(checkSub, 3600000); // Check every hour
    return () => clearInterval(interval);
  }, []);

  const handleSubscribe = () => {
    localStorage.setItem('moallem_is_subscribed', 'true');
    setSubStatus(SubscriptionStatus.ACTIVE);
    setShowPayWall(false);
    addNotification("تم التفعيل ✅", "أهلاً بك في النسخة الكاملة! استمتع بالدراسة.", "success");
  };

  const addNotification = (title: string, message: string, type: SmartNotification['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotif: SmartNotification = { id, title, message, type, timestamp: Date.now() };
    setNotifications(prev => [newNotif, ...prev]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 6000);
  };

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); addNotification("متصل الآن ✅", "تمت استعادة الإنترنت، سأحاول المتابعة.", "success"); };
    const handleOffline = () => { setIsOnline(false); addNotification("انقطع الإنترنت ⚠️", "يرجى التحقق من الشبكة، جاري الانتظار.", "warning"); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  const addCurriculum = (title: string, content: string) => {
    const newCurriculum: Curriculum = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      content,
      addedAt: Date.now(),
      progress: 0,
      completedTopics: [],
      weakPoints: [],
    };
    setCurriculums(prev => [...prev, newCurriculum]);
    setActiveCurriculum(newCurriculum);
    addNotification("تمت إضافة المادة 📚", `تمت إضافة ${title} إلى مكتبتك.`, 'success');
  };

  const removeCurriculum = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurriculums(prev => prev.filter(c => c.id !== id));
    if (activeCurriculum?.id === id) {
      setActiveCurriculum(null);
      stopSession();
    }
  };

  const processAudioChunk = async (base64Audio: string) => {
    const out = outputAudioContextRef.current;
    if (!out) return;
    if (out.state === 'suspended') await out.resume();
    
    try {
      const buf = await decodeAudioData(decode(base64Audio), out, 24000, 1);
      const source = out.createBufferSource();
      source.buffer = buf;
      source.connect(out.destination);
      
      const currentTime = out.currentTime;
      if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime + AUDIO_SAFETY_MARGIN;
      }
      
      const startTime = nextStartTimeRef.current;
      
      source.onended = () => {
        activeSourcesRef.current.delete(source);
        if (activeSourcesRef.current.size === 0) setIsSpeaking(false);
      };
      
      source.start(startTime);
      activeSourcesRef.current.add(source);
      nextStartTimeRef.current = startTime + buf.duration;
      setIsSpeaking(true);
      setIsThinking(false);
    } catch (err) { console.error("Audio decode failure:", err); }
  };

  const startSession = async (withVideo: boolean = false, isRetry = false) => {
    if (subStatus === SubscriptionStatus.EXPIRED) {
      setShowPayWall(true);
      return;
    }
    if (!activeCurriculum) return setError("يرجى اختيار مادة أولاً عيني.");
    if (!navigator.onLine) return setError("لا يوجد اتصال بالإنترنت حالياً.");

    if (!isRetry) reconnectAttempts.current = 0;
    setIsReconnecting(isRetry);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      if (!outputAudioContextRef.current) outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ 
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: withVideo || isCameraOn
        });
      }
      
      setActiveStream(streamRef.current);
      if (withVideo) setShowVideoCall(true);

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {}, 
          systemInstruction: `أنت "معلم الهوا" العراقي. الطالب أمامك. المحتوى: ${activeCurriculum.content}. تحدث بلهجة عراقية بأسلوب مشجع.`,
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: gender === TutorGender.MALE ? 'Puck' : 'Kore' } } },
        },
        callbacks: {
          onopen: () => {
            setIsSessionActive(true);
            setIsReconnecting(false);
            reconnectAttempts.current = 0;
            
            const audioSource = audioContextRef.current!.createMediaStreamSource(streamRef.current!);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            const silentGain = audioContextRef.current!.createGain();
            silentGain.gain.value = 0;
            
            scriptProcessor.onaudioprocess = (e) => {
              if (!isOnline) return;
              const inputData = e.inputBuffer.getChannelData(0);
              sessionPromiseRef.current?.then(s => s.sendRealtimeInput({ media: createPcmBlob(inputData) }));
            };
            
            audioSource.connect(scriptProcessor);
            scriptProcessor.connect(silentGain);
            silentGain.connect(audioContextRef.current!.destination);

            if (withVideo || isCameraOn) {
              const visionVideo = document.createElement('video');
              visionVideo.srcObject = streamRef.current;
              visionVideo.muted = true;
              visionVideo.play().then(() => {
                const canvas = processingCanvasRef.current || document.createElement('canvas');
                const ctx = canvas.getContext('2d', { alpha: false });
                frameIntervalRef.current = window.setInterval(() => {
                  if (!ctx || isProcessingFrame.current || !isOnline || !isSessionActive) return;
                  isProcessingFrame.current = true;
                  const scale = VISION_TARGET_WIDTH / visionVideo.videoWidth;
                  canvas.width = VISION_TARGET_WIDTH;
                  canvas.height = visionVideo.videoHeight * scale;
                  ctx.drawImage(visionVideo, 0, 0, canvas.width, canvas.height);
                  canvas.toBlob((blob) => {
                    if (blob) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const base64 = (reader.result as string).split(',')[1];
                        sessionPromiseRef.current?.then(s => {
                          s.sendRealtimeInput({ media: { data: base64, mimeType: 'image/jpeg' } });
                          isProcessingFrame.current = false;
                        }).catch(() => isProcessingFrame.current = false);
                      };
                      reader.readAsDataURL(blob);
                    } else isProcessingFrame.current = false;
                  }, 'image/jpeg', VISION_IMAGE_QUALITY);
                }, VISION_CAPTURE_INTERVAL);
              });
            }
          },
          onmessage: async (m) => {
            if (m.serverContent?.modelTurn) setIsThinking(false);
            if (m.serverContent?.outputTranscription) currentTranscriptionRef.current += m.serverContent.outputTranscription.text;
            if (m.serverContent?.turnComplete) {
              if (currentTranscriptionRef.current.trim()) {
                setMessages(prev => [...prev.slice(-20), { role: 'model', text: currentTranscriptionRef.current, timestamp: Date.now() }]);
                currentTranscriptionRef.current = "";
              }
            }
            if (m.serverContent?.modelTurn?.parts) {
              for (const part of m.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) await processAudioChunk(part.inlineData.data);
              }
            }
            if (m.serverContent?.interrupted) {
              activeSourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              activeSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsSpeaking(false);
            }
          },
          onclose: () => handleSessionInterruption(withVideo),
          onerror: (e) => handleSessionInterruption(withVideo)
        }
      });
    } catch (e) { 
      setError("تعذر الوصول للميكروفون."); 
      setIsReconnecting(false); 
    }
  };

  const handleSessionInterruption = (withVideo: boolean) => {
    if (!isSessionActive) return;
    if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts.current++;
      setIsReconnecting(true);
      const delay = Math.min(Math.pow(1.5, reconnectAttempts.current) * 1000, 10000);
      setTimeout(() => { if (navigator.onLine) startSession(withVideo, true); else handleSessionInterruption(withVideo); }, delay);
    } else {
      stopSession();
      setError("واجهنا صعوبة في استقرار الاتصال.");
    }
  };

  const stopSession = () => {
    setIsSessionActive(false);
    setIsSpeaking(false);
    setIsReconnecting(false);
    setIsThinking(false);
    setShowVideoCall(false);
    if (frameIntervalRef.current) { clearInterval(frameIntervalRef.current); frameIntervalRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setActiveStream(null);
    if (audioContextRef.current) { audioContextRef.current.close().catch(() => {}); audioContextRef.current = null; }
    if (outputAudioContextRef.current) { outputAudioContextRef.current.close().catch(() => {}); outputAudioContextRef.current = null; }
    sessionPromiseRef.current?.then(s => { try { s.close(); } catch(e) {} });
    sessionPromiseRef.current = null;
    activeSourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  };

  const generateExam = async (type: 'auto' | 'comprehensive' | 'ai-normal' = 'auto') => {
    if (subStatus === SubscriptionStatus.EXPIRED) return setShowPayWall(true);
    if (!activeCurriculum) return setError("أضف مادة أولاً.");
    setIsGeneratingExam(true);
    setIsThinking(true);
    addNotification("جاري التحليل 🧠", "سأقوم بتوليد أسئلة دقيقة.", 'info');
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let prompt = '';
      
      if (type === 'comprehensive') {
        prompt = `ولد امتحان MCQ شامل وعميق يغطي كافة تفاصيل منهج: ${activeCurriculum.title}. المحتوى: ${activeCurriculum.content}.`;
      } else if (type === 'ai-normal') {
        prompt = `ولد اختباراً من الأسئلة العادية (MCQ) التي تركز على المفاهيم الأساسية والجوهرية لمنهج: ${activeCurriculum.title} بأسلوب مدرسي مبسط. المحتوى: ${activeCurriculum.content}.`;
      } else {
        prompt = `ولد اختبار MCQ سريع ومختصر لـ: ${activeCurriculum.title}. المحتوى: ${activeCurriculum.content}.`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING }
              },
              required: ["question", "options", "correctIndex", "explanation"]
            }
          }
        }
      });
      setExamQuestions(JSON.parse(response.text));
      setShowExamOverlay(true);
    } catch (e) { setError("فشل توليد الامتحان."); } finally { setIsThinking(false); setIsGeneratingExam(false); }
  };

  const startSearch = async () => {
    if (subStatus === SubscriptionStatus.EXPIRED) return setShowPayWall(true);
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `بحث مفصل حول: ${searchQuery}`,
        config: { tools: [{ googleSearch: {} }] }
      });
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources: SearchSource[] = chunks.filter((c: any) => c.web).map((chunk: any) => ({ title: chunk.web?.title || 'مصدر', uri: chunk.web?.uri || '#' }));
      setMessages(prev => [...prev.slice(-20), { role: 'model', text: response.text || 'لا نتائج.', timestamp: Date.now(), sources }]);
      setSearchQuery('');
    } catch (e) { setError("فشل البحث في الويب."); } finally { setIsSearching(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 selection:bg-blue-100 selection:text-blue-900">
      <canvas ref={processingCanvasRef} className="hidden" />

      {isReconnecting && (
        <div className="fixed inset-0 z-[500] bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center p-6">
           <div className="bg-white p-10 rounded-[3rem] shadow-2xl flex flex-col items-center gap-6 max-w-sm text-center">
              <div className="w-16 h-16 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
              <h2 className="text-2xl font-black text-slate-800">جاري الربط..</h2>
              <p className="text-slate-500 font-bold">حدث تذبذب بسيط في الاتصال.</p>
           </div>
        </div>
      )}

      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[600] bg-amber-500 text-white py-2 px-6 flex items-center justify-center gap-3 font-bold text-xs">
          <i className="fa-solid fa-cloud-slash"></i>
          انقطع الاتصال بالإنترنت..
        </div>
      )}

      {showPayWall && <SubscriptionWall onSubscribe={handleSubscribe} onClose={() => setShowPayWall(false)} subStatus={subStatus} />}

      <div className="fixed top-24 left-6 z-[300] flex flex-col gap-3 pointer-events-none w-80 md:w-96">
        {notifications.map((notif) => (
          <div key={notif.id} className="pointer-events-auto p-4 rounded-[1.5rem] shadow-2xl border-l-4 glass animate-in slide-in-from-left-10 flex items-start gap-4 border-blue-400">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-100 text-blue-600">
              <i className={`fa-solid ${notif.type === 'warning' ? 'fa-triangle-exclamation' : 'fa-info-circle'}`}></i>
            </div>
            <div className="flex-1">
              <h5 className="font-black text-sm text-slate-800 mb-0.5">{notif.title}</h5>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">{notif.message}</p>
            </div>
          </div>
        ))}
      </div>

      <header className="glass sticky top-0 z-50 px-6 py-4 flex flex-col md:flex-row gap-4 justify-between items-center border-b border-slate-200/50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white w-10 h-10 rounded-xl shadow-lg flex items-center justify-center animate-pulse"><i className="fa-solid fa-graduation-cap"></i></div>
            <h1 className="text-xl font-black text-slate-800">معلم الهوا <span className="text-blue-600">Pro</span></h1>
          </div>
          <div className={`px-4 py-1.5 rounded-full text-[11px] font-black border flex items-center gap-2 ${subStatus === SubscriptionStatus.ACTIVE ? 'bg-green-50 text-green-600 border-green-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
            <i className={`fa-solid ${subStatus === SubscriptionStatus.ACTIVE ? 'fa-check-circle' : 'fa-clock'}`}></i>
            {subStatus === SubscriptionStatus.ACTIVE ? 'الاشتراك فعال' : `تجربة مجانية: ${trialDaysLeft} أيام`}
          </div>
        </div>
        <nav className="flex gap-2 bg-slate-100/80 p-1.5 rounded-2xl overflow-x-auto no-scrollbar">
          {['tutor', 'exam', 'lab', 'search'].map(t => (
            <button key={t} onClick={() => setActiveTab(t as any)} className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === t ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'}`}>{t === 'tutor' ? 'المعلم' : t === 'exam' ? 'الامتحانات' : t === 'lab' ? 'المختبر' : 'الباحث'}</button>
          ))}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <AvatarDisplay gender={gender} isActive={isSessionActive} isSpeaking={isSpeaking} onGenderChange={setGender} />
          <div className="space-y-3">
            <button onClick={() => isSessionActive ? stopSession() : startSession(true)} disabled={!activeCurriculum || !isOnline} className={`w-full py-5 rounded-[2.2rem] font-black text-lg flex items-center justify-center gap-4 transition-all shadow-xl ${isSessionActive && showVideoCall ? 'bg-red-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'}`}>
              <i className={`fa-solid ${isSessionActive && showVideoCall ? 'fa-phone-slash' : 'fa-video'}`}></i> {isSessionActive && showVideoCall ? "إنهاء الفيديو" : "دردشة فيديو"}
            </button>
            <button onClick={() => isSessionActive ? stopSession() : startSession(false)} disabled={!activeCurriculum || !isOnline} className={`w-full py-5 rounded-[2.2rem] font-black text-lg flex items-center justify-center gap-4 transition-all border-2 ${isSessionActive && !showVideoCall ? 'bg-white text-red-500 border-red-100 shadow-lg' : 'bg-slate-900 text-white disabled:opacity-50'}`}> {isSessionActive && !showVideoCall ? "إنهاء الصوت" : "درس صوّتي"} </button>
          </div>
          <StudyTimer onPhaseChange={(b) => addNotification(b ? "استراحة ☕" : "تركيز 📚", b ? "وقت الاستراحة!" : "لنعد للدراسة!", 'info')} />
          <div className="glass rounded-[2.5rem] p-6 space-y-4 shadow-lg border border-slate-100">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-3"><i className="fa-solid fa-folder-open text-blue-500"></i> مكتبة المواد</h3>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
              {curriculums.map((cur) => (
                <div key={cur.id} onClick={() => { setActiveCurriculum(cur); lastActivityRef.current = Date.now(); }} className={`relative p-5 rounded-3xl cursor-pointer transition-all border-2 flex flex-col gap-3 ${activeCurriculum?.id === cur.id ? 'bg-blue-50 border-blue-400' : 'bg-white border-slate-100'}`}>
                  <div className="flex justify-between items-center">
                    <p className={`font-black text-sm truncate ${activeCurriculum?.id === cur.id ? 'text-blue-700' : 'text-slate-700'}`}>{cur.title}</p>
                    <button onClick={(e) => removeCurriculum(cur.id, e)} className="text-slate-300 hover:text-red-500"><i className="fa-solid fa-trash-can"></i></button>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${cur.progress}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button onClick={() => setShowPayWall(true)} className="w-full p-4 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-transform active:scale-95">
            <i className="fa-solid fa-star text-yellow-400"></i> إدارة الاشتراك
          </button>
        </div>

        <div className="lg:col-span-8 space-y-8 pb-10">
          {activeTab === 'tutor' && (
            <>
              <CurriculumInput onAdd={addCurriculum} />
              {activeCurriculum && (
                <div className="space-y-6">
                  <div className="bg-white rounded-[3rem] p-8 shadow-2xl border border-blue-50">
                    <h3 className="text-2xl font-black text-slate-800 mb-4">{activeCurriculum.title}</h3>
                    <div className="w-full bg-slate-50 h-3 rounded-full overflow-hidden border">
                      <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${activeCurriculum.progress}%` }}></div>
                    </div>
                  </div>
                  <div className="glass min-h-[450px] rounded-[3.5rem] p-10 overflow-y-auto space-y-6 shadow-xl relative border border-white">
                    {messages.length === 0 ? <p className="text-center text-slate-400 py-20 font-black">ابدأ الجلسة للتواصل مع المعلم بوضوح.</p> : messages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`p-5 rounded-[2rem] max-w-[85%] shadow-sm leading-relaxed border ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-slate-800 border-slate-50'}`}>
                          <p className="text-sm font-bold">{m.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          {activeTab === 'exam' && (
            <div className="space-y-8">
               <div className="bg-slate-200/50 p-2 rounded-[2rem] flex max-w-2xl mx-auto shadow-inner overflow-x-auto no-scrollbar">
                 {[
                   { id: 'auto', label: 'تلقائي' },
                   { id: 'comprehensive', label: 'شامل' },
                   { id: 'ai-normal', label: 'أسئلة عادية' },
                   { id: 'manual', label: 'يدوي' }
                 ].map(m => (
                   <button 
                     key={m.id} 
                     onClick={() => setExamMode(m.id as any)} 
                     className={`flex-1 min-w-[100px] py-4 rounded-2xl font-black text-[11px] transition-all ${examMode === m.id ? 'bg-white text-orange-600 shadow-xl' : 'text-slate-500'}`}
                   >
                     {m.label}
                   </button>
                 ))}
               </div>
               
               {examMode === 'ai-normal' || examMode === 'manual' ? (
                 <ExamBuilder 
                    initialMode={examMode === 'ai-normal' ? 'ai-normal' : 'manual'}
                    onStartExam={(qs) => {setExamQuestions(qs); setShowExamOverlay(true);}} 
                 />
               ) : (
                 <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border text-center space-y-8 border-orange-50">
                    <div className="w-24 h-24 bg-orange-100 text-orange-600 rounded-[2.5rem] flex items-center justify-center mx-auto text-4xl shadow-xl animate-pulse">
                      <i className={`fa-solid ${examMode === 'auto' ? 'fa-bolt' : 'fa-atom'}`}></i>
                    </div>
                    <h3 className="text-3xl font-black text-slate-800">
                      {examMode === 'auto' ? 'بدء الاختبار التلقائي' : 'الاختبار الشامل'}
                    </h3>
                    <p className="text-slate-500 font-bold max-w-sm mx-auto">
                      اختر نوع الاختبار المناسب لمستواك لتقييم فهمك للمادة بشكل سريع وذكي.
                    </p>
                    <button 
                      onClick={() => generateExam(examMode as any)} 
                      disabled={isGeneratingExam || !activeCurriculum} 
                      className="w-full max-w-md mx-auto py-6 bg-orange-600 text-white rounded-[2.2rem] font-black text-xl shadow-2xl active:scale-95 disabled:opacity-50"
                    >
                      {isGeneratingExam ? 'جاري التحليل..' : 'ابدأ الاختبار الآن'}
                    </button>
                 </div>
               )}
            </div>
          )}
          {activeTab === 'lab' && <MediaLab curriculumContent={activeCurriculum?.content || ''} />}
          {activeTab === 'search' && (
            <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border border-emerald-50 space-y-8">
                <h3 className="text-2xl font-black text-emerald-800 flex items-center gap-4"><i className="fa-solid fa-brain"></i> البحث الموثق</h3>
                <div className="flex flex-col md:flex-row gap-4">
                    <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && startSearch()} placeholder="ابحث عن معلومة إضافية..." className="flex-1 p-6 bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-[1.8rem] outline-none font-bold" />
                    <button onClick={startSearch} disabled={isSearching || !searchQuery.trim()} className="bg-emerald-600 text-white px-10 py-5 rounded-[1.8rem] font-black active:scale-95 disabled:opacity-50">ابحث الآن</button>
                </div>
            </div>
          )}
        </div>
      </main>
      {showExamOverlay && <ExamSystem questions={examQuestions} title={examMode === 'comprehensive' ? "اختبار شامل" : examMode === 'ai-normal' ? "أسئلة عادية" : "اختبار سريع"} onClose={() => setShowExamOverlay(false)} onComplete={() => setShowExamOverlay(false)} />}
      {showVideoCall && <VideoCallOverlay gender={gender} isSpeaking={isSpeaking} isThinking={isThinking} userStream={activeStream} onClose={stopSession} isSessionActive={isSessionActive} isReconnecting={isReconnecting} />}
      {error && <div className="fixed bottom-8 right-8 left-8 md:left-auto md:w-[450px] bg-red-600 text-white p-6 rounded-[2rem] shadow-2xl flex items-start justify-between z-[400] font-black animate-in slide-in-from-bottom-10"><span>{error}</span><button onClick={() => setError(null)}><i className="fa-solid fa-xmark"></i></button></div>}
    </div>
  );
};

export default App;
