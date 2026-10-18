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

  // Subtle centered wall perspective (resting flush against clinic wall)
  const defaultRotX = 4;
  const defaultRotY = 0;
  const defaultRotZ = 0;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isStatic || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Normalized [-1, 1] relative to center
    const normX = (x / rect.width) * 2 - 1;
    const normY = (y / rect.height) * 2 - 1;

    // Dynamic rotation mapping (range: -12deg to +12deg with 0.85 scale)
    const rotY = normX * 12;
    const rotX = -normY * 12 + 4;

    setTransformStyle(`rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) rotateZ(0deg) scale3d(0.86, 0.86, 0.86)`);
    setGlare({
      x: Math.round((x / rect.width) * 100),
      y: Math.round((y / rect.height) * 100),
      opacity: 0.60
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
      <div className={`w-full max-w-[300px] rounded-2xl glass-pass-card p-3 select-none shadow-md ${className}`}>
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

        <div className="py-2 flex items-center justify-between gap-2">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-800/80">
              District Health Pass
            </div>
            <h4 
              className="text-sm font-black text-slate-900 tracking-tight leading-tight"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Instant Reception Pass
            </h4>
            <p className="text-[10px] font-medium text-slate-600 mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
              Guaranteed Queue Slot
            </p>
          </div>
          <div className="p-1.5 rounded-xl bg-white/95 border border-white shadow-xs flex items-center justify-center shrink-0">
            <QrCode className="w-6 h-6 text-slate-800" />
          </div>
        </div>

        <div className="pt-2 border-t border-white/40 flex items-center justify-between text-[9.5px] font-semibold text-slate-700">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-clinic-700 shrink-0" />
            <span>Zero Waiting Queue</span>
          </div>
          <div className="text-[9px] font-bold text-emerald-800 bg-white/70 px-1.5 py-0.5 rounded border border-white/60">
            Live Sync
          </div>
        </div>
      </div>
    );
  }

  // Full 3D interactive mode on desktop (Mounted against clinic wall)
  return (
    <div
      className={`relative perspective-1200 ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 3D Card Container (Compact 0.82 Scale & Wall Perspective) */}
      <div
        ref={cardRef}
        className={`w-[245px] sm:w-[255px] lg:w-[265px] rounded-2xl preserve-3d will-change-transform cursor-pointer select-none transition-all duration-300 ease-out ${
          isHovered ? '' : 'glass-pass-idle'
        }`}
        style={{
          transform: isHovered
            ? transformStyle
            : `rotateX(${defaultRotX}deg) rotateY(${defaultRotY}deg) rotateZ(${defaultRotZ}deg) scale3d(0.82, 0.82, 0.82)`,
        }}
      >
        {/* Realistic Glass Surface with Wall Contrast */}
        <div className="relative rounded-2xl p-3.5 lg:p-4 glass-pass-card overflow-hidden preserve-3d">
          
          {/* Dynamic Specular Glare Overlay */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-300 rounded-2xl z-30"
            style={{
              opacity: glare.opacity,
              background: `radial-gradient(circle 220px at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.18) 35%, transparent 70%)`,
            }}
          />

          {/* Ambient subtle decorative light refraction streaks inside glass */}
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-emerald-400/15 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-teal-500/15 rounded-full blur-xl pointer-events-none" />

          {/* ── Layer 1: Top Bar (translateZ 24px) ── */}
          <div
            className="flex items-center justify-between pb-2.5 border-b border-white/40"
            style={{ transform: 'translateZ(24px)' }}
          >
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
              Verified
            </span>
          </div>

          {/* ── Layer 2: Center Body - Patient Priority Pass (translateZ 34px) ── */}
          <div
            className="py-2.5 flex items-center justify-between gap-2"
            style={{ transform: 'translateZ(34px)' }}
          >
            <div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-800/80 mb-0.5">
                District Health Pass
              </div>
              <h4
                className="text-base font-black text-slate-900 tracking-tight leading-snug"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                Instant Reception Pass
              </h4>
              <p className="text-[10px] font-medium text-slate-600 mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                Guaranteed Queue Slot
              </p>
            </div>

            {/* Micro Holographic QR Code Badge (translateZ 42px) */}
            <div
              className="relative p-1.5 rounded-xl bg-white/95 border border-white shadow-sm flex items-center justify-center shrink-0 text-slate-800 transition-transform"
              style={{ transform: 'translateZ(42px)' }}
            >
              <QrCode className="w-6.5 h-6.5 text-slate-800" />
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[7px] font-black shadow-xs">
                ✓
              </div>
            </div>
          </div>

          {/* ── Layer 3: Bottom Trust Bar (translateZ 22px) ── */}
          <div
            className="pt-2 border-t border-white/40 flex items-center justify-between text-[9.5px] font-semibold text-slate-700"
            style={{ transform: 'translateZ(22px)' }}
          >
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-clinic-700 shrink-0" />
              <span>Zero Waiting Queue</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-800 bg-white/60 px-1.5 py-0.5 rounded border border-white/60">
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
