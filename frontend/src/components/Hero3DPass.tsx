import React, { useRef, useState, useCallback } from 'react';
import { ShieldCheck, QrCode, Sparkles, CheckCircle2 } from 'lucide-react';

interface Hero3DPassProps {
  className?: string;
  isStatic?: boolean;
}

export const Hero3DPass: React.FC<Hero3DPassProps> = ({ className = '', isStatic = false }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
  const [transformStyle, setTransformStyle] = useState<string>('');

  // Resting 3D tilt coordinates (rotateX: 3deg, rotateY: -7deg)
  const defaultRotX = 3;
  const defaultRotY = -7;
  const defaultRotZ = -1;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isStatic || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Normalized [-1, 1] relative to center
    const normX = (x / rect.width) * 2 - 1;
    const normY = (y / rect.height) * 2 - 1;

    // Dynamic rotation mapping (range: -12deg to +12deg with 0.82 scale)
    const rotY = normX * 10 - 7;
    const rotX = -normY * 10 + 3;

    setTransformStyle(`rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) rotateZ(-0.5deg) scale3d(0.83, 0.83, 0.83)`);
    setGlare({
      x: Math.round((x / rect.width) * 100),
      y: Math.round((y / rect.height) * 100),
      opacity: 0.55
    });
  }, [isStatic]);

  const handleMouseEnter = useCallback(() => {
    if (!isStatic) setIsHovered(true);
  }, [isStatic]);

  const handleMouseLeave = useCallback(() => {
    if (!isStatic) {
      setIsHovered(false);
      setGlare(prev => ({ ...prev, opacity: 0 }));
      setTransformStyle('');
    }
  }, [isStatic]);

  // If rendered statically on mobile/tablet viewports (<1024px)
  if (isStatic) {
    return (
      <div className={`w-full max-w-[270px] rounded-2xl p-3 select-none shadow-xl border bg-slate-900/95 text-white border-slate-700/70 backdrop-blur-md ${className}`}>
        <div className="flex items-center justify-between pb-2 border-b border-white/40 dark:border-white/10">
          <div className="inline-flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E]" />
            </span>
            <span className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase font-mono">
              TOKEN #042
            </span>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-500/20 dark:border-emerald-700/60 text-[9px] font-bold uppercase tracking-wider">
            <Sparkles className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
            Verified Pass
          </span>
        </div>

        <div className="py-2 flex items-center justify-between gap-2">
          <div>
            <div className="text-[8.5px] font-bold uppercase tracking-widest text-emerald-800/80 dark:text-emerald-400">
              Instant Clinic Pass
            </div>
            <h4 
              className="text-[13.5px] font-black text-white tracking-tight leading-tight"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Digital Consultation Token
            </h4>
            <p className="text-[9.5px] font-medium text-slate-300 mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
              Guaranteed Queue Token
            </p>
          </div>
          <div className="p-1.5 rounded-xl bg-slate-800/90 border border-slate-700 shadow-xs flex items-center justify-center shrink-0">
            <QrCode className="w-6 h-6 text-white" />
          </div>
        </div>

        <div className="pt-2 border-t border-white/40 dark:border-white/10 flex items-center justify-between text-[9px] font-semibold text-slate-300">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-clinic-700 dark:text-clinic-400 shrink-0" />
            <span>Skip Waiting Lines</span>
          </div>
          <div className="text-[8.5px] font-bold text-emerald-800 dark:text-emerald-300 bg-slate-800/90 text-emerald-300 px-1.5 py-0.5 rounded border border-white/60 dark:border-slate-700">
            Live Sync
          </div>
        </div>
      </div>
    );
  }

  // Full 3D interactive mode on desktop (Mounted cleanly on clinic wall gap)
  return (
    <div
      className={`relative perspective-1200 ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 3D Card Container (Compact max-w-[270px], 0.80 Scale & Wall Perspective) */}
      <div
        ref={cardRef}
        className={`w-[235px] sm:w-[245px] lg:w-[255px] max-w-[270px] rounded-2xl preserve-3d will-change-transform cursor-pointer select-none transition-all duration-300 ease-out ${
          isHovered ? '' : 'glass-pass-idle'
        }`}
        style={{
          transform: isHovered
            ? transformStyle
            : `rotateX(${defaultRotX}deg) rotateY(${defaultRotY}deg) rotateZ(${defaultRotZ}deg) scale3d(0.80, 0.80, 0.80)`,
        }}
      >
        {/* Realistic Glass Surface with Wall Contrast */}
        <div className="relative rounded-2xl p-3.5 overflow-hidden preserve-3d border bg-slate-900/95 text-white border-slate-700/70 shadow-2xl backdrop-blur-md">
          
          {/* Dynamic Specular Glare Overlay */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-300 rounded-2xl z-30"
            style={{
              opacity: glare.opacity,
              background: `radial-gradient(circle 200px at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.18) 35%, transparent 70%)`,
            }}
          />

          {/* Ambient subtle decorative light refraction streaks inside glass */}
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-emerald-400/15 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -bottom-6 -left-6 w-18 h-18 bg-teal-500/15 rounded-full blur-xl pointer-events-none" />

          {/* ── Layer 1: Top Bar (translateZ 22px) ── */}
          <div
            className="flex items-center justify-between pb-2.5 border-b border-white/40 dark:border-white/10"
            style={{ transform: 'translateZ(22px)' }}
          >
            <div className="inline-flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E]" />
              </span>
              <span className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase font-mono">
                TOKEN #042
              </span>
            </div>

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-500/20 dark:border-emerald-700/60 text-[9px] font-bold uppercase tracking-wider">
              <Sparkles className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
              Verified
            </span>
          </div>

          {/* ── Layer 2: Center Body - Patient Priority Pass (translateZ 30px) ── */}
          <div
            className="py-2.5 flex items-center justify-between gap-2"
            style={{ transform: 'translateZ(30px)' }}
          >
            <div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-800/80 dark:text-emerald-400 mb-0.5">
                Instant Clinic Pass
              </div>
              <h4
                className="text-[14px] lg:text-[15px] font-black text-white tracking-tight leading-snug"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                Digital Consultation Token
              </h4>
              <p className="text-[9.5px] font-medium text-slate-300 mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                Guaranteed Queue Token
              </p>
            </div>

            {/* Micro Holographic QR Code Badge (translateZ 38px) */}
            <div
              className="relative p-1.5 rounded-xl bg-slate-800/90 border border-slate-700 shadow-sm flex items-center justify-center shrink-0 text-white transition-transform"
              style={{ transform: 'translateZ(38px)' }}
            >
              <QrCode className="w-6 h-6 text-white" />
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[7px] font-black shadow-xs">
                ✓
              </div>
            </div>
          </div>

          {/* ── Layer 3: Bottom Trust Bar (translateZ 20px) ── */}
          <div
            className="pt-2 border-t border-white/40 dark:border-white/10 flex items-center justify-between text-[9px] font-semibold text-slate-300"
            style={{ transform: 'translateZ(20px)' }}
          >
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-clinic-700 dark:text-emerald-400 shrink-0" />
              <span>Skip Waiting Lines</span>
            </div>
            <div className="flex items-center gap-1 text-[8.5px] font-bold text-emerald-800 dark:text-emerald-300 bg-slate-800/90 text-emerald-300 px-1.5 py-0.5 rounded border border-white/60 dark:border-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
              Live Clinic Sync
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
export default Hero3DPass;
