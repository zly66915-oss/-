
import React, { useState } from 'react';
import { SubscriptionStatus } from '../types';

interface SubscriptionWallProps {
  onSubscribe: () => void;
  onClose: () => void;
  subStatus: SubscriptionStatus;
}

type PaymentMethod = 'fib' | 'zain' | 'asia';
type WallStep = 'selection' | 'verification';

const SubscriptionWall: React.FC<SubscriptionWallProps> = ({ onSubscribe, onClose, subStatus }) => {
  const [copied, setCopied] = useState(false);
  const [activeMethod, setActiveMethod] = useState<PaymentMethod>('zain');
  const [step, setStep] = useState<WallStep>('selection');
  const [activationCode, setActivationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const paymentNumber = "07704382836";

  const handleCopy = () => {
    navigator.clipboard.writeText(paymentNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerifyCode = () => {
    setIsVerifying(true);
    // محاكاة للتحقق من الكود (في الواقع يتم ربطه بلقاعدة بيانات)
    // هنا نفترض أن أي كود مكون من 6 أرقام سيعمل للمحاكاة، أو يمكنك تخصيصه
    setTimeout(() => {
      if (activationCode.length >= 4) {
        onSubscribe();
      } else {
        alert("كود التفعيل غير صحيح. يرجى التأكد من الإدارة.");
      }
      setIsVerifying(false);
    }, 1500);
  };

  const openWhatsApp = () => {
    const message = encodeURIComponent(`مرحباً، قمت بتحويل مبلغ الاشتراك عبر ${activeMethod === 'zain' ? 'زين كاش' : activeMethod === 'asia' ? 'رصيد آسيا' : 'FIB'}. يرجى تفعيل حسابي.`);
    window.open(`https://wa.me/9647704382836?text=${message}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[600] bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[3.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 relative flex flex-col max-h-[95vh]">
        
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-6 left-6 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/40 flex items-center justify-center transition-all backdrop-blur-md">
          <i className="fa-solid fa-xmark text-white"></i>
        </button>

        <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-700 p-8 text-center text-white shrink-0">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/30">
            <i className="fa-solid fa-gem text-3xl text-yellow-300"></i>
          </div>
          <h2 className="text-2xl font-black mb-1 tracking-tight">معلم الهوا بلس</h2>
          <p className="opacity-80 font-bold text-sm">تفعيل يدوي عبر الإدارة</p>
        </div>

        <div className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar">
          {step === 'selection' ? (
            <>
              {/* Pricing Info */}
              <div className="bg-slate-50 p-5 rounded-[2rem] text-center border border-slate-100">
                <div className="text-slate-400 font-black text-[9px] uppercase tracking-widest mb-1">الاشتراك الشهري</div>
                <div className="flex items-center justify-center gap-2">
                   <span className="text-3xl font-black text-slate-800">5,000</span>
                   <span className="text-lg font-bold text-slate-500">د.ع</span>
                </div>
              </div>

              {/* Payment Method Tabs */}
              <div className="space-y-4">
                 <div className="flex p-1 bg-slate-100 rounded-2xl gap-1">
                    {['zain', 'asia', 'fib'].map((m) => (
                      <button 
                        key={m}
                        onClick={() => setActiveMethod(m as PaymentMethod)}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${activeMethod === m ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
                      >
                        {m === 'zain' ? 'زين كاش' : m === 'asia' ? 'رصيد آسيا' : 'FIB'}
                      </button>
                    ))}
                 </div>

                 {/* Dynamic Payment Card */}
                 <div className={`rounded-[2rem] p-6 text-white border shadow-xl relative overflow-hidden transition-all duration-500 ${
                   activeMethod === 'zain' ? 'bg-red-600 border-red-500' : 
                   activeMethod === 'asia' ? 'bg-purple-700 border-purple-600' : 
                   'bg-slate-900 border-slate-800'
                 }`}>
                    <div className="absolute top-4 left-6 flex items-center gap-2 opacity-20">
                        <i className={`fa-solid ${activeMethod === 'zain' ? 'fa-wallet' : activeMethod === 'asia' ? 'fa-mobile-screen' : 'fa-building-columns'} text-3xl`}></i>
                    </div>
                    
                    <div className="relative z-10 space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-bold text-white/70 mb-1">بيانات التحويل</p>
                                <p className="text-xl font-black tracking-wider uppercase">
                                  {activeMethod === 'zain' ? 'Zain Cash' : activeMethod === 'asia' ? 'Asiacell' : 'FIB'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between bg-white/10 p-4 rounded-xl border border-white/10">
                            <div>
                                <p className="text-[9px] text-white/50 font-bold mb-0.5 uppercase">الرقم المعتمد</p>
                                <p className="text-lg font-black tracking-[0.1em]">{paymentNumber}</p>
                            </div>
                            <button 
                                onClick={handleCopy}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${copied ? 'bg-green-500' : 'bg-white/10 hover:bg-white/20'}`}
                            >
                                <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'} text-xs`}></i>
                            </button>
                        </div>

                        <div className="bg-black/10 p-3 rounded-xl border border-white/5">
                           <p className="text-[10px] font-bold leading-relaxed text-white/90">
                             قم بتحويل مبلغ <span className="underline">5,000 دينار</span> ثم اضغط على تفعيل لمراسلة الإدارة بالوصل.
                           </p>
                        </div>
                    </div>
                 </div>
              </div>

              <button 
                onClick={() => setStep('verification')}
                className="w-full py-4 bg-blue-600 text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                تفعيل عبر الإدارة
                <i className="fa-solid fa-arrow-left"></i>
              </button>
            </>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-left-4">
               <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fa-solid fa-comment-dots text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-black text-slate-800">خطوة التأكيد النهائي</h3>
                  <p className="text-xs text-slate-500 font-bold">يرجى إرسال لقطة شاشة للتحويل إلى الرقم <br/> <span className="text-slate-900">{paymentNumber}</span> عبر الواتساب.</p>
               </div>

               <div className="space-y-3">
                  <button 
                    onClick={openWhatsApp}
                    className="w-full py-4 bg-green-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-lg shadow-green-100 hover:bg-green-600 transition-all"
                  >
                    <i className="fa-brands fa-whatsapp text-lg"></i>
                    مراسلة الإدارة لتأكيد التحويل
                  </button>
                  
                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                    <div className="relative flex justify-center text-[10px]"><span className="bg-white px-4 text-slate-400 font-bold uppercase tracking-widest">أو أدخل كود التفعيل</span></div>
                  </div>

                  <div className="space-y-3">
                     <input 
                        type="text" 
                        value={activationCode}
                        onChange={(e) => setActivationCode(e.target.value)}
                        placeholder="أدخل الكود المستلم من الإدارة..."
                        className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold text-center tracking-widest"
                     />
                     <button 
                        onClick={handleVerifyCode}
                        disabled={isVerifying || !activationCode}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                      >
                        {isVerifying ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-key"></i>}
                        تفعيل الحساب بالكود
                     </button>
                  </div>
               </div>

               <button 
                  onClick={() => setStep('selection')}
                  className="w-full text-[10px] font-black text-slate-400 hover:text-slate-600 transition-colors uppercase"
               >
                 <i className="fa-solid fa-chevron-right mr-1"></i> العودة لبيانات التحويل
               </button>
            </div>
          )}

          <div className="text-center pt-2">
            <p className="text-[9px] text-slate-400 font-bold leading-relaxed">
              لا يتم تفعيل أي اشتراك تلقائياً دون التأكد من الرقم <span className="text-blue-500">{paymentNumber}</span> حصراً.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionWall;
