import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [showTagline, setShowTagline] = useState(false);

  useEffect(() => {
    const timer = setTimeout(onComplete, 4000);
    const taglineTimer = setTimeout(() => setShowTagline(true), 1500);
    return () => {
      clearTimeout(timer);
      clearTimeout(taglineTimer);
    };
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[100] bg-gradient-to-b from-slate-50 to-white flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Text Content - ABOVE THE BUS */}
      <div className="mb-12 flex flex-col items-center z-20">
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.5, duration: 1.2, ease: "easeOut" }}
          className="text-center flex flex-col items-center"
        >
          <img src="/icon.svg" alt="DIU Transport Logo" className="w-20 h-20 mb-6 rounded-3xl shadow-2xl shadow-emerald-200" />
          <h1 className="text-6xl font-black text-slate-900 tracking-tighter drop-shadow-sm">
            DIU<span className="text-emerald-600 ml-2">Transport</span>
          </h1>

          <AnimatePresence>
            {showTagline && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-4 flex flex-col items-center"
              >
                <div className="h-1 w-16 bg-emerald-50 mb-4 rounded-full shadow-sm shadow-emerald-200" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.5em]">
                  Your Journey Starts Here
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Bus Animation Section - LOWER ON SCREEN */}
      <div className="relative group perspective-[1500px] mb-8">
        {/* Ground Shadow */}
        <motion.div
          initial={{ x: '-100vw', opacity: 0 }}
          animate={{ x: 0, opacity: 0.15 }}
          transition={{ duration: 2.5, ease: [0.23, 1, 0.32, 1] }}
          className="absolute bottom-[-12px] left-8 right-8 h-6 bg-slate-900 rounded-[100%] blur-xl"
        />

        {/* The Bus Body */}
        <motion.div
          initial={{ x: '-100vw' }}
          animate={{
            x: 0,
            y: [0, -3, 0],
          }}
          transition={{
            x: { duration: 2.2, ease: [0.22, 1, 0.36, 1] },
            y: { duration: 0.4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }
          }}
          className="relative z-10 w-80 sm:w-[540px] h-32 sm:h-44"
        >
          <svg viewBox="0 0 600 240" className="w-full h-full drop-shadow-[0_25px_50px_rgba(0,0,0,0.15)]">
            <defs>
              <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="40%" stopColor="#059669" />
                <stop offset="100%" stopColor="#064e3b" />
              </linearGradient>
              <linearGradient id="glassGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="45%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#020617" />
              </linearGradient>
              <linearGradient id="rimGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="50%" stopColor="#f8fafc" />
                <stop offset="100%" stopColor="#475569" />
              </linearGradient>
              <filter id="lightGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Elegant Modern Chassis */}
            <path
              d="M45,40 L515,40 Q565,40 585,85 L595,145 Q600,180 550,180 L45,180 Q10,180 10,145 L10,85 Q10,40 45,40"
              fill="url(#bodyGradient)"
              stroke="#ffffff15"
              strokeWidth="1"
            />

            {/* Window Section */}
            <g opacity="0.98">
              <path d="M35,52 L490,52 Q520,52 540,82 L550,128 L35,128 Z" fill="url(#glassGradient)" />
              <rect x="135" y="52" width="2" height="76" fill="#ffffff08" />
              <rect x="255" y="52" width="2" height="76" fill="#ffffff08" />
              <rect x="375" y="52" width="2" height="76" fill="#ffffff08" />
              <path d="M35,52 L490,52 L440,75 L35,75 Z" fill="white" opacity="0.05" />
            </g>

            {/* Wheels - Front */}
            <g transform="translate(135, 185)">
              <circle r="28" fill="#0f172a" />
              <circle r="22" fill="#1e293b" stroke="#334155" strokeWidth="1" />
              <motion.g animate={{ rotate: 360 }} transition={{ duration: 0.4, repeat: Infinity, ease: "linear" }}>
                {[...Array(10)].map((_, i) => (
                  <rect key={i} x="-1.5" y="-18" width="3" height="8" rx="1.5" fill="url(#rimGradient)" transform={`rotate(${i * 36})`} opacity="0.8" />
                ))}
              </motion.g>
              <circle r="6" fill="#f8fafc" opacity="0.9" />
            </g>

            {/* Wheels - Rear */}
            <g transform="translate(460, 185)">
              <circle r="28" fill="#0f172a" />
              <circle r="22" fill="#1e293b" stroke="#334155" strokeWidth="1" />
              <motion.g animate={{ rotate: 360 }} transition={{ duration: 0.4, repeat: Infinity, ease: "linear" }}>
                {[...Array(10)].map((_, i) => (
                  <rect key={i} x="-1.5" y="-18" width="3" height="8" rx="1.5" fill="url(#rimGradient)" transform={`rotate(${i * 36})`} opacity="0.8" />
                ))}
              </motion.g>
              <circle r="6" fill="#f8fafc" opacity="0.9" />
            </g>

            {/* Front Accents & Lights */}
            <g transform="translate(555, 135)">
              <motion.rect
                width="35"
                height="4"
                rx="2"
                fill="#ffffff"
                filter="url(#lightGlow)"
                animate={{ opacity: [1, 0, 1, 0, 1] }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  repeatDelay: 1.5,
                  times: [0, 0.2, 0.4, 0.6, 0.8]
                }}
              />
              <rect y="12" width="28" height="2" rx="1" fill="#10b981" opacity="0.6" />
            </g>

            {/* Modern Wing Mirror */}
            <g transform="translate(540, 95)">
              <path d="M0,5 L35,0 Q45,0 45,15 L0,20 Z" fill="#064e3b" stroke="#ffffff15" />
              <path d="M5,8 L32,5 Q38,5 38,15 L5,18 Z" fill="#047857" opacity="0.4" />
            </g>
          </svg>
        </motion.div>
      </div>

      {/* Progress Indicator */}
      <div className="mt-8 w-64 h-[3px] bg-slate-100 rounded-full overflow-hidden relative border border-slate-200/50 shadow-inner">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 4, ease: "easeInOut" }}
          className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
        />
      </div>
    </motion.div>
  );
};
