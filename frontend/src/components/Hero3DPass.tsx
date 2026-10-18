import React, { useRef, useState, useCallback } from 'react';
import { ShieldCheck, QrCode, Sparkles, CheckCircle2 } from 'lucide-react';

interface Hero3DPassProps {
  className?: string;
}

export const Hero3DPass: React.FC<Hero3DPassProps> = ({ className = '' }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
  const [transformStyle, setTransformStyle] = useState<string>('');

  // Natural resting 3D tilt angles (Timothy Ricks Webflow 3D style)
  const defaultRotX = 10;
  const defaultRotY = -12;
  const defaultRotZ = -2;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Normalized [-1, 1] relative to center
    const normX = (x / rect.width) * 2 - 1;
    const normY = (y / rect.height) * 2 - 1;

    // Map to dynamic rotation (range: -18deg to +18deg)
    const rotY = normX * 18 - 8;
    const rotX = -normY * 18 + 6;

    setTransformStyle(`rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) rotateZ(-1deg) scale3d(1.03, 1.03, 1.03)`);
    setGlare({
      x: Math.round((x / rect.width) * 100),
      y: Math.round((y / rect.height) * 100),
      opacity: 0.65
    });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setGlare(prev => ({ ...prev, opacity: 0 }));
    setTransformStyle('');
  }, []);

  return (
    <div
      className={`relative perspective-1200 ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 3D Card Container */}
      <div
        ref={cardRef}
        className={`w-[290px] sm:w-[315px] lg:w-[330px] rounded-3xl preserve-3d will-change-transform cursor-pointer select-none transition-all duration-300 ease-out ${
          isHovered ? '' : 'glass-pass-idle'
        }`}
        style={{
          transform: isHovered
            ? transformStyle
            : `rotateX(${defaultRotX}deg) rotateY(${defaultRotY}deg) rotateZ(${defaultRotZ}deg)`,
        }}
      >
        {/* Realistic Glass Surface */}
        <div className="relative rounded-3xl p-5 lg:p-5.5 glass-pass-card overflow-hidden preserve-3d">
          
          {/* Dynamic Specular Glare Overlay */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-300 rounded-3xl z-30"
            style={{
              opacity: glare.opacity,
              background: `radial-gradient(circle 260px at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 35%, transparent 70%)`,
            }}
          />

          {/* Ambient subtle decorative light refraction streaks inside glass */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-400/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-teal-500/15 rounded-full blur-2xl pointer-events-none" />

          {/* ── Layer 1: Top Bar (translateZ 26px) ── */}
          <div
            className="flex items-center justify-between pb-3.5 border-b border-white/40"
            style={{ transform: 'translateZ(26px)' }}
          >
            <div className="inline-flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#22C55E]" />
              </span>
              <span className="text-[11px] font-bold text-slate-800 tracking-wider uppercase font-mono">
                TOKEN #042
              </span>
            </div>

            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-900 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider">
              <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
              Verified
            </span>
          </div>

          {/* ── Layer 2: Center Body - Patient Priority Pass (translateZ 36px) ── */}
          <div
            className="py-4 flex items-center justify-between gap-3"
            style={{ transform: 'translateZ(36px)' }}
          >
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-800/80 mb-0.5">
                District Health Pass
              </div>
              <h4
                className="text-lg lg:text-xl font-black text-slate-900 tracking-tight leading-snug"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                Instant Reception Pass
              </h4>
              <p className="text-[11px] font-medium text-slate-600 mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                Guaranteed Queue Slot
              </p>
            </div>

            {/* Micro Holographic QR Code Badge (translateZ 44px) */}
            <div
              className="relative p-2.5 rounded-2xl bg-white/95 border border-white shadow-md flex items-center justify-center shrink-0 text-slate-800 transition-transform"
              style={{ transform: 'translateZ(44px)' }}
            >
              <QrCode className="w-9 h-9 text-slate-800" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[8px] font-black shadow-xs">
                ✓
              </div>
            </div>
          </div>

          {/* ── Layer 3: Bottom Trust Bar (translateZ 24px) ── */}
          <div
            className="pt-3 border-t border-white/40 flex items-center justify-between text-[11px] font-semibold text-slate-700"
            style={{ transform: 'translateZ(24px)' }}
          >
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-clinic-700 shrink-0" />
              <span>Zero Waiting Queue</span>
            </div>
            <div className="flex items-center gap-1 text-[10.5px] font-bold text-emerald-800 bg-white/60 px-2 py-0.5 rounded-md border border-white/60">
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
