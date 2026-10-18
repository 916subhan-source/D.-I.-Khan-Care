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

  // Harmonious resting 3D tilt coordinates angling gracefully toward center search box
  const defaultRotX = 6;
  const defaultRotY = -8;
  const defaultRotZ = -1;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isStatic || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Normalized [-1, 1] relative to center
    const normX = (x / rect.width) * 2 - 1;
    const normY = (y / rect.height) * 2 - 1;

    // Map to dynamic rotation (range: -14deg to +14deg with 0.90 base scale)
    const rotY = normX * 14 - 6;
    const rotX = -normY * 14 + 4;

    setTransformStyle(`rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) rotateZ(-0.5deg) scale3d(0.93, 0.93, 0.93)`);
    setGlare({
      x: Math.round((x / rect.width) * 100),
      y: Math.round((y / rect.height) * 100),
      opacity: 0.65
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
      <div className={`w-full max-w-[320px] rounded-2xl glass-pass-card p-3.5 select-none shadow-md ${className}`}>
        <div className="flex items-center justify-between pb-2 border-b border-white/40">
          <div className="inline-flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E]" />
            </span>
            <span className="text-[10px] font-bold text-slate-800 tracking-wider uppercase font-mono">
              TOKEN #042
            </span>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-900 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-wider">
            <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
            Verified Pass
          </span>
        </div>

        <div className="py-2.5 flex items-center justify-between gap-2.5">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-800/80">
              District Health Pass
            </div>
            <h4 
              className="text-base font-black text-slate-900 tracking-tight leading-tight"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Instant Reception Pass
            </h4>
            <p className="text-[10.5px] font-medium text-slate-600 mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
              Guaranteed Queue Slot
            </p>
          </div>
          <div className="p-1.5 rounded-xl bg-white/95 border border-white shadow-xs flex items-center justify-center shrink-0">
            <QrCode className="w-7 h-7 text-slate-800" />
          </div>
        </div>

        <div className="pt-2 border-t border-white/40 flex items-center justify-between text-[10px] font-semibold text-slate-700">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-clinic-700 shrink-0" />
            <span>Zero Waiting Queue</span>
          </div>
          <div className="text-[9.5px] font-bold text-emerald-800 bg-white/70 px-1.5 py-0.5 rounded border border-white/60">
            Live Hospital Sync
          </div>
        </div>
      </div>
    );
  }

  // Full 3D interactive mode on desktop
  return (
    <div
      className={`relative perspective-1200 ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 3D Card Container (Refined 0.90 Scale & Dimensions) */}
      <div
        ref={cardRef}
        className={`w-[265px] sm:w-[280px] lg:w-[290px] rounded-3xl preserve-3d will-change-transform cursor-pointer select-none transition-all duration-300 ease-out ${
          isHovered ? '' : 'glass-pass-idle'
        }`}
        style={{
          transform: isHovered
            ? transformStyle
            : `rotateX(${defaultRotX}deg) rotateY(${defaultRotY}deg) rotateZ(${defaultRotZ}deg) scale3d(0.90, 0.90, 0.90)`,
        }}
      >
        {/* Realistic Glass Surface */}
        <div className="relative rounded-3xl p-4 lg:p-4.5 glass-pass-card overflow-hidden preserve-3d">
          
          {/* Dynamic Specular Glare Overlay */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-300 rounded-3xl z-30"
            style={{
              opacity: glare.opacity,
              background: `radial-gradient(circle 240px at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.18) 35%, transparent 70%)`,
            }}
          />

          {/* Ambient subtle decorative light refraction streaks inside glass */}
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-emerald-400/15 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-teal-500/15 rounded-full blur-xl pointer-events-none" />

          {/* ── Layer 1: Top Bar (translateZ 26px) ── */}
          <div
            className="flex items-center justify-between pb-3 border-b border-white/40"
            style={{ transform: 'translateZ(26px)' }}
          >
            <div className="inline-flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E]" />
              </span>
              <span className="text-[10.5px] font-bold text-slate-800 tracking-wider uppercase font-mono">
                TOKEN #042
              </span>
            </div>

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-900 border border-emerald-500/20 text-[9.5px] font-bold uppercase tracking-wider">
              <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
              Verified
            </span>
          </div>

          {/* ── Layer 2: Center Body - Patient Priority Pass (translateZ 36px) ── */}
          <div
            className="py-3 flex items-center justify-between gap-2.5"
            style={{ transform: 'translateZ(36px)' }}
          >
            <div>
              <div className="text-[9.5px] font-bold uppercase tracking-widest text-emerald-800/80 mb-0.5">
                District Health Pass
              </div>
              <h4
                className="text-base lg:text-[1.12rem] font-black text-slate-900 tracking-tight leading-snug"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                Instant Reception Pass
              </h4>
              <p className="text-[10px] font-medium text-slate-600 mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                Guaranteed Queue Slot
              </p>
            </div>

            {/* Micro Holographic QR Code Badge (translateZ 44px) */}
            <div
              className="relative p-2 rounded-xl bg-white/95 border border-white shadow-sm flex items-center justify-center shrink-0 text-slate-800 transition-transform"
              style={{ transform: 'translateZ(44px)' }}
            >
              <QrCode className="w-7 h-7 text-slate-800" />
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[7px] font-black shadow-xs">
                ✓
              </div>
            </div>
          </div>

          {/* ── Layer 3: Bottom Trust Bar (translateZ 24px) ── */}
          <div
            className="pt-2.5 border-t border-white/40 flex items-center justify-between text-[10px] font-semibold text-slate-700"
            style={{ transform: 'translateZ(24px)' }}
          >
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-clinic-700 shrink-0" />
              <span>Zero Waiting Queue</span>
            </div>
            <div className="flex items-center gap-1 text-[9.5px] font-bold text-emerald-800 bg-white/60 px-1.5 py-0.5 rounded border border-white/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              Live Hospital Sync
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
export default Hero3DPass;
