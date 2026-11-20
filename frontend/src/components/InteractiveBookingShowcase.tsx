import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  ArrowRight,
  Sparkles,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  QrCode,
  UserCheck,
  Stethoscope,
  Building2,
  Ticket,
  Smartphone,
  KeyRound,
  Send,
  Zap,
  Check
} from 'lucide-react';
import { playButtonClickSound } from '../utils/sound';

interface InteractiveBookingShowcaseProps {
  onStartBooking?: () => void;
  onTrackAppointment?: () => void;
}

export function InteractiveBookingShowcase({
  onStartBooking,
  onTrackAppointment
}: InteractiveBookingShowcaseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState<boolean>(true);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);

  // Micro-interaction simulation states
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number; visible: boolean }>({ x: 50, y: 50, visible: true });
  const [isClicking, setIsClicking] = useState<boolean>(false);
  const [simFilter, setSimFilter] = useState<'Cardiologist' | 'Child Specialist' | 'Gynecologist'>('Cardiologist');
  const [simShift, setSimShift] = useState<'morning' | 'evening'>('morning');
  const [simSlotSelected, setSimSlotSelected] = useState<boolean>(false);
  const [simPatientName, setSimPatientName] = useState<string>('');
  const [simPhone, setSimPhone] = useState<string>('');
  const [simOtpEntered, setSimOtpEntered] = useState<boolean>(false);
  const [showWhatsAppNotice, setShowWhatsAppNotice] = useState<boolean>(false);

  const steps = [
    {
      id: 0,
      number: '01',
      title: 'Search & Pick Specialist',
      shortLabel: '1. Find Specialist',
      icon: Stethoscope,
      subtitle: 'Filter by specialty, symptoms, or hospital in D.I. Khan',
      description:
        'Search top specialists by symptom, doctor name, or hospital location. View verified credentials, clinic location opposite DHQ hospital, and consultation fee before reserving your slot.',
      bullets: [
        '100% PMDC-verified local specialists',
        'Compare clinic fees and operating shifts',
        'Transparent ratings from verified patients',
        'Filter by DHQ, Al-Shifa, and Zafar Hospital'
      ],
      ctaText: 'Find a Specialist Now',
      windowTitle: 'dikhancare.io/doctors?specialty=cardiology',
      statusBadge: 'Verified Directory',
      statusColor: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800'
    },
    {
      id: 1,
      number: '02',
      title: 'Pick Exact Time Slot',
      shortLabel: '2. Select Slot',
      icon: Calendar,
      subtitle: 'Real-time morning and evening clinic slot availability',
      description:
        'Select your preferred consultation date and morning or evening shift. Choose an exact consultation slot so you avoid crowded clinic waiting halls.',
      bullets: [
        'Real-time live slot calendar',
        'Morning & Evening shift choices',
        'Guaranteed reservation held for you',
        'Pay Rs. 1,000 cash at clinic arrival'
      ],
      ctaText: 'View Available Timings',
      windowTitle: 'dikhancare.io/doctor/dr-waqar-khan/slots',
      statusBadge: 'Live Slot Matrix',
      statusColor: 'text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800'
    },
    {
      id: 2,
      number: '03',
      title: 'Patient Phone & Quick OTP',
      shortLabel: '3. Fast Verify',
      icon: Smartphone,
      subtitle: 'Zero advance payment • 10-second WhatsApp confirmation',
      description:
        'Enter patient name and mobile number. Instant 4-digit code verifies your appointment with zero upfront deposit or hidden fees.',
      bullets: [
        'No advance credit card or bank deposit needed',
        'Instant WhatsApp SMS code verification',
        'One-click patient token confirmation',
        'Guaranteed appointment held on clinic book'
      ],
      ctaText: 'Book Instant Token',
      windowTitle: 'dikhancare.io/book/verify?slot=0620pm',
      statusBadge: 'Instant OTP',
      statusColor: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800'
    },
    {
      id: 3,
      number: '04',
      title: 'WhatsApp Slip & Live Queue',
      shortLabel: '4. Digital Slip',
      icon: Ticket,
      subtitle: 'Digital token on WhatsApp synced with Clinic Waiting Room TV',
      description:
        'Your verified digital appointment slip is sent immediately to WhatsApp with QR code and Google Maps directions. Track the live queue on your phone and arrive right when your turn is called.',
      bullets: [
        'Instant Slip # and Token sent to WhatsApp',
        'One-tap Google Maps clinic navigation',
        'Live Token Tracker synced with waiting room TV',
        'Dedicated receptionist check-in at desk'
      ],
      ctaText: 'Track Digital Slip',
      windowTitle: 'dikhancare.io/track?slip=DIK-20261120-004',
      statusBadge: 'Slip Confirmed',
      statusColor: 'text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/60 border-cyan-200 dark:border-cyan-800'
    }
  ];

  // ── Intersection Observer: Start playing continuously when scrolled into view ──
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          setIsAutoPlaying(true);
        }
      },
      { threshold: 0.25 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  // ── Continuous Seamless Video-Like Simulation Timeline ──
  useEffect(() => {
    if (!isAutoPlaying || !isInView) return;

    // Total duration per step is 4.5 seconds
    const stepDuration = 4500;
    const intervalMs = 40;
    let elapsedInStep = 0;

    const timer = setInterval(() => {
      elapsedInStep += intervalMs;
      const pct = Math.min(100, (elapsedInStep / stepDuration) * 100);
      setProgress(pct);

      // Scene 1: Search & Pick Doctor (activeStep === 0)
      if (activeStep === 0) {
        if (pct < 25) {
          // Cursor glides to symptom filter "Cardiologist"
          setCursorPos({ x: 22, y: 32, visible: true });
        } else if (pct >= 25 && pct < 45) {
          // Click filter
          if (!isClicking && pct >= 25 && pct <= 28) {
            setIsClicking(true);
            playButtonClickSound(0.2);
            setSimFilter('Cardiologist');
            setTimeout(() => setIsClicking(false), 300);
          }
          // Move cursor down to doctor card "Pick Slot" button
          setCursorPos({ x: 84, y: 76, visible: true });
        } else if (pct >= 45 && pct < 85) {
          // Hover and click "Pick Slot"
          setCursorPos({ x: 84, y: 76, visible: true });
          if (!isClicking && pct >= 58 && pct <= 61) {
            setIsClicking(true);
            playButtonClickSound(0.25);
            setTimeout(() => setIsClicking(false), 350);
          }
        }
      }

      // Scene 2: Date & Slot Matrix (activeStep === 1)
      else if (activeStep === 1) {
        if (pct < 30) {
          // Cursor moves to evening shift button
          setCursorPos({ x: 74, y: 44, visible: true });
        } else if (pct >= 30 && pct < 50) {
          // Click evening shift
          if (!isClicking && pct >= 30 && pct <= 33) {
            setIsClicking(true);
            playButtonClickSound(0.2);
            setSimShift('evening');
            setTimeout(() => setIsClicking(false), 300);
          }
          // Move cursor down to available slot #03 (06:20 PM)
          setCursorPos({ x: 62, y: 64, visible: true });
        } else if (pct >= 50 && pct < 75) {
          // Click slot #03
          if (!isClicking && pct >= 50 && pct <= 53) {
            setIsClicking(true);
            playButtonClickSound(0.24);
            setSimSlotSelected(true);
            setTimeout(() => setIsClicking(false), 300);
          }
          // Move cursor to "Proceed to Details" button
          setCursorPos({ x: 86, y: 88, visible: true });
        } else if (pct >= 75) {
          // Click proceed
          if (!isClicking && pct >= 78 && pct <= 81) {
            setIsClicking(true);
            playButtonClickSound(0.25);
            setTimeout(() => setIsClicking(false), 350);
          }
        }
      }

      // Scene 3: Patient Phone & OTP (activeStep === 2)
      else if (activeStep === 2) {
        if (pct < 30) {
          setCursorPos({ x: 45, y: 32, visible: true });
          setSimPatientName('Muhammad Usman');
        } else if (pct >= 30 && pct < 60) {
          setCursorPos({ x: 45, y: 52, visible: true });
          setSimPhone('0332 5255879');
          setSimOtpEntered(true);
        } else if (pct >= 60 && pct < 85) {
          // Move to Confirm Appointment button
          setCursorPos({ x: 50, y: 84, visible: true });
        } else if (pct >= 85) {
          // Click confirm button
          if (!isClicking && pct >= 86 && pct <= 89) {
            setIsClicking(true);
            playButtonClickSound(0.3);
            setTimeout(() => setIsClicking(false), 350);
          }
        }
      }

      // Scene 4: WhatsApp Digital Slip Confirmed (activeStep === 3)
      else if (activeStep === 3) {
        if (pct < 20) {
          setShowWhatsAppNotice(true);
          setCursorPos({ x: 50, y: 18, visible: true });
        } else if (pct >= 20 && pct < 65) {
          // Cursor inspects Live Queue status
          setCursorPos({ x: 65, y: 68, visible: true });
        } else if (pct >= 65) {
          // Cursor moves to Google Maps navigation
          setCursorPos({ x: 75, y: 88, visible: true });
        }
      }

      // Transition to next scene smoothly
      if (elapsedInStep >= stepDuration) {
        elapsedInStep = 0;
        setProgress(0);
        setIsClicking(false);
        setActiveStep((prev) => {
          const next = (prev + 1) % steps.length;
          playButtonClickSound(0.18);
          // Reset interaction states on loop
          if (next === 0) {
            setSimSlotSelected(false);
            setSimPatientName('');
            setSimPhone('');
            setSimOtpEntered(false);
            setShowWhatsAppNotice(false);
          }
          return next;
        });
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isAutoPlaying, isInView, activeStep, isClicking]);

  const handleStepJump = (idx: number) => {
    playButtonClickSound(0.24);
    setActiveStep(idx);
    setProgress(0);
    setIsClicking(false);
  };

  const currentStep = steps[activeStep];

  return (
    <section
      ref={containerRef}
      className="relative my-8 sm:my-14 overflow-hidden rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-gradient-to-b from-white via-slate-50/70 to-emerald-50/30 dark:from-slate-900 dark:via-[#071317] dark:to-slate-950 shadow-xl dark:shadow-2xl"
    >
      {/* Decorative Technical Blueprint Background Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-25"
        style={{
          backgroundImage: `radial-gradient(circle, #059669 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* Atmospheric Soft Light Blooms */}
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-emerald-400/10 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-teal-400/10 dark:bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* ── Header Badge & Title ── */}
      <div className="relative z-10 px-5 pt-8 sm:px-10 sm:pt-12 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 dark:bg-emerald-950/80 border border-emerald-300/80 dark:border-emerald-700/60 text-xs font-bold text-emerald-900 dark:text-emerald-300 shadow-2xs mb-3">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
          <span>Continuous Live Booking Walkthrough</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider hidden sm:inline">
            Zero Advance Fees
          </span>
        </div>

        <h2
          className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          See How Easy It Is to Book in{' '}
          <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
            Dera Ismail Khan
          </span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2.5 max-w-2xl mx-auto leading-relaxed">
          Watch the automated live demonstration: finding a verified consultant, selecting an evening slot, entering patient details, and receiving the official WhatsApp token pass.
        </p>
      </div>

      {/* ── Split-Screen Showcase Widget with Synchronized Fluid Continuity ── */}
      <div
        className="relative z-10 p-4 sm:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center"
        onMouseEnter={() => setIsAutoPlaying(false)}
        onMouseLeave={() => setIsAutoPlaying(true)}
      >
        {/* ── Left Column: Synchronized Fluid Sliding Step Overviews ── */}
        <div className="lg:col-span-5 overflow-hidden relative">
          <div
            className="flex w-full transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ transform: `translateX(-${activeStep * 100}%)` }}
          >
            {steps.map((st, idx) => {
              const isActive = activeStep === idx;
              return (
                <div
                  key={st.id}
                  className="w-full shrink-0 flex flex-col justify-center space-y-4 sm:space-y-5 transition-all duration-500 pr-2"
                  style={{
                    opacity: isActive ? 1 : 0.25,
                    transform: isActive ? 'scale(1) translateX(0)' : 'scale(0.96) translateX(12px)'
                  }}
                >
                  {/* Step Pill & Indicator */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black text-sm flex items-center justify-center shadow-md shadow-emerald-600/30">
                      {st.number}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        Step {st.number} of 04
                      </span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {st.subtitle}
                      </span>
                    </div>
                  </div>

                  {/* Heading */}
                  <h3
                    className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  >
                    {st.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {st.description}
                  </p>

                  {/* Feature Bullet Points */}
                  <div className="space-y-2 pt-1">
                    {st.bullets.map((b, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>

                  {/* Call to Action Button */}
                  <div className="pt-3 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => {
                        playButtonClickSound(0.3);
                        if (activeStep === 3 && onTrackAppointment) {
                          onTrackAppointment();
                        } else if (onStartBooking) {
                          onStartBooking();
                        }
                      }}
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-700 via-teal-700 to-clinic-800 hover:from-emerald-800 hover:to-clinic-900 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-emerald-700/25 transition-all transform hover:-translate-y-0.5 cursor-pointer active:scale-98"
                    >
                      <span>{st.ctaText}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      Free • Instant Token
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right Column: Continuous Fluid Sliding Mockup Screen with Large Animated Cursor ── */}
        <div className="lg:col-span-7">
          <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl overflow-hidden transition-all duration-500">
            {/* macOS Browser Window Header */}
            <div className="px-4 py-3 bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3">
              {/* Traffic light window controls */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block shadow-2xs" />
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shadow-2xs" />
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-2xs" />
              </div>

              {/* Browser Address Bar with Animated URL Changes */}
              <div className="flex-1 max-w-sm mx-auto px-3 py-1 bg-white dark:bg-slate-900/90 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-slate-600 dark:text-slate-300 truncate text-center shadow-2xs transition-all duration-300">
                https://{currentStep.windowTitle}
              </div>

              {/* Status Badge */}
              <div
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 shrink-0 transition-colors duration-300 ${currentStep.statusColor}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                <span className="hidden sm:inline">{currentStep.statusBadge}</span>
              </div>
            </div>

            {/* Canvas Container with Continuous Horizontal Sliding Track and Large Dynamic Cursor */}
            <div className="overflow-hidden relative w-full bg-slate-50/50 dark:bg-slate-950/40 min-h-[410px] sm:min-h-[450px]">
              
              {/* ── Large High-Visibility Animated Virtual Cursor ── */}
              {cursorPos.visible && (
                <div
                  className="absolute pointer-events-none z-40 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{
                    left: `${cursorPos.x}%`,
                    top: `${cursorPos.y}%`,
                    transform: 'translate(-4px, -4px)'
                  }}
                >
                  {/* Large High-Contrast macOS Style SVG Pointer (32px) */}
                  <svg
                    className={`w-8 h-8 transition-transform duration-150 drop-shadow-2xl ${isClicking ? 'scale-90' : 'scale-100'}`}
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.36z"
                      fill="#047857"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    {/* Glowing Fingertip Dot */}
                    <circle cx="6" cy="4" r="2" fill="#34d399" />
                  </svg>

                  {/* Active Click Ripple Wave */}
                  {isClicking && (
                    <span className="absolute -top-3 -left-3 w-12 h-12 rounded-full border-2 border-emerald-400 bg-emerald-400/40 animate-ping pointer-events-none" />
                  )}
                </div>
              )}

              {/* ── Horizontal Sliding Track ── */}
              <div
                className="flex w-full transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{ transform: `translateX(-${activeStep * 100}%)` }}
              >
                {/* ── Screen 1: Search, Symptoms & Doctor Selection ── */}
                <div
                  className="w-full shrink-0 p-4 sm:p-6 flex flex-col justify-center space-y-4 transition-all duration-500"
                  style={{
                    opacity: activeStep === 0 ? 1 : 0.35,
                    transform: activeStep === 0 ? 'scale(1)' : 'scale(0.96)'
                  }}
                >
                  {/* Search Input Bar Mockup */}
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 shadow-xs">
                    <Search className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 flex-1">
                      Chest Pain, Heart Specialist
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                      3 Doctors in D.I. Khan
                    </span>
                  </div>

                  {/* Specialty / Symptom Filter Pills */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {(['Cardiologist', 'Child Specialist', 'Gynecologist'] as const).map((sp) => (
                      <div
                        key={sp}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-xs ${
                          simFilter === sp
                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 ring-2 ring-emerald-500/50'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {sp}
                      </div>
                    ))}
                  </div>

                  {/* Doctor Card Mockup (Selected with Highlight) */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border-2 border-emerald-500 shadow-md transition-all relative overflow-hidden">
                    <div className="flex items-start gap-3 sm:gap-4">
                      {/* Doctor Avatar */}
                      <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-bold text-xl shadow-sm flex-shrink-0">
                        <span>WK</span>
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-800" />
                      </div>

                      {/* Doctor Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                            Dr. Waqar Khan Gandapur
                          </h4>
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" /> PMDC Verified
                          </span>
                        </div>

                        <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                          MBBS, FCPS Cardiology • Consultant Cardiologist
                        </p>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">Opposite DHQ Hospital Gate, Circular Road, D.I. Khan</span>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">Consultation Fee</span>
                            <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                              Rs. 1,000 <span className="text-[10px] text-emerald-600 font-bold">(Pay at Desk)</span>
                            </p>
                          </div>
                          <div className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${isClicking && activeStep === 0 ? 'bg-emerald-900 scale-95' : 'bg-emerald-700 text-white'}`}>
                            <span>Pick Slot</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Screen 2: Real-time Date, Shift & Slot Picker ── */}
                <div
                  className="w-full shrink-0 p-4 sm:p-6 flex flex-col justify-center space-y-4 transition-all duration-500"
                  style={{
                    opacity: activeStep === 1 ? 1 : 0.35,
                    transform: activeStep === 1 ? 'scale(1)' : 'scale(0.96)'
                  }}
                >
                  {/* Doctor Mini-header */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                        WK
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Dr. Waqar Khan Gandapur</p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Cardiology Clinic • Opposite DHQ</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      25 Min Consultation
                    </span>
                  </div>

                  {/* Shift Selector */}
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                        simShift === 'morning'
                          ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span>☀️ Morning (09:00 AM - 01:00 PM)</span>
                    </div>
                    <div
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                        simShift === 'evening'
                          ? 'bg-emerald-700 text-white border-emerald-800 shadow-md ring-2 ring-emerald-500/40'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span>🌙 Evening (05:00 PM - 09:00 PM)</span>
                    </div>
                  </div>

                  {/* Available Time Slots Grid */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Evening Slots (Today, Nov 20):
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { time: '05:30 PM', status: 'taken', token: '#01' },
                        { time: '05:55 PM', status: 'taken', token: '#02' },
                        { time: '06:20 PM', status: 'available', token: '#03' },
                        { time: '06:45 PM', status: 'available', token: '#04' }
                      ].map((s, idx) => (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-xl border text-center transition-all ${
                            s.status === 'taken'
                              ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 border-slate-200/60 dark:border-slate-800 opacity-60 line-through'
                              : simSlotSelected && s.token === '#03'
                              ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-lg ring-2 ring-emerald-400/50 scale-102'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <p className="text-[11px] font-bold">{s.time}</p>
                          <p className="text-[9px] mt-0.5 opacity-90">{s.status === 'taken' ? 'Booked' : s.token}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary Bar & Proceed */}
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between shadow-xs">
                    <span className="text-xs text-emerald-900 dark:text-emerald-200 font-semibold">
                      Selected Slot: <strong>06:20 PM (Token #03)</strong>
                    </span>
                    <div className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all ${isClicking && activeStep === 1 ? 'bg-emerald-900 scale-95' : 'bg-emerald-700 text-white'}`}>
                      <span>Proceed to Book</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                {/* ── Screen 3: Patient Phone & Quick OTP Verification ── */}
                <div
                  className="w-full shrink-0 p-4 sm:p-6 flex flex-col justify-center space-y-4 transition-all duration-500"
                  style={{
                    opacity: activeStep === 2 ? 1 : 0.35,
                    transform: activeStep === 2 ? 'scale(1)' : 'scale(0.96)'
                  }}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                          Patient Contact &amp; Fast Verification
                        </h4>
                        <p className="text-[11px] text-slate-500">Zero Advance Payment Required</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      100% Free
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Patient Full Name:
                      </label>
                      <div className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white">
                        {simPatientName || 'Muhammad Usman'}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        WhatsApp Contact Number:
                      </label>
                      <div className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white flex items-center justify-between">
                        <span>{simPhone || '0332 5255879'}</span>
                        <span className="text-[10px] font-bold text-emerald-600">✓ SMS &amp; WhatsApp</span>
                      </div>
                    </div>

                    {/* Quick 4-Digit OTP Code Simulation */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Instant Verification Code:
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-600">Auto-Detected Code</span>
                      </div>
                      <div className="flex items-center justify-center gap-3">
                        {['7', '2', '9', '4'].map((digit, i) => (
                          <div
                            key={i}
                            className={`w-10 h-10 rounded-xl border-2 font-mono font-bold text-lg flex items-center justify-center ${
                              simOtpEntered
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 shadow-xs'
                                : 'border-slate-300 bg-white text-slate-700'
                            }`}
                          >
                            {simOtpEntered ? digit : '•'}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Confirm Booking Button */}
                    <div className={`w-full py-3 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all ${isClicking && activeStep === 2 ? 'bg-emerald-900 scale-95' : 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white'}`}>
                      <Check className="w-4 h-4" />
                      <span>Confirm Appointment &amp; Generate Token Slip</span>
                    </div>
                  </div>
                </div>

                {/* ── Screen 4: Digital Slip & Live TV Waiting Room Queue ── */}
                <div
                  className="w-full shrink-0 p-4 sm:p-6 flex flex-col justify-center space-y-3.5 transition-all duration-500"
                  style={{
                    opacity: activeStep === 3 ? 1 : 0.35,
                    transform: activeStep === 3 ? 'scale(1)' : 'scale(0.96)'
                  }}
                >
                  {/* WhatsApp Notification Banner Dropdown */}
                  {showWhatsAppNotice && (
                    <div className="p-2.5 rounded-xl bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2 shadow-lg animate-fade-in border border-emerald-500">
                      <MessageSquare className="w-4 h-4 text-emerald-200 flex-shrink-0 animate-bounce" />
                      <span className="truncate flex-1">
                        <strong>WhatsApp:</strong> Assalam-o-Alaikum! Your consultation token #03 is confirmed.
                      </span>
                      <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">Now</span>
                    </div>
                  )}

                  {/* Digital Slip Receipt Card */}
                  <div className="relative p-4 rounded-2xl bg-gradient-to-br from-emerald-700 via-teal-800 to-clinic-950 text-white shadow-xl overflow-hidden transform transition-transform duration-500">
                    <div className="flex items-center justify-between pb-2.5 border-b border-white/20">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-300 animate-pulse" />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">
                            Digital Pass Confirmed
                          </p>
                          <p className="text-xs font-mono font-bold">SLIP # DIK-20261120-004</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-wider">
                        100% Free Pass
                      </span>
                    </div>

                    <div className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-emerald-200">Patient Consultation Token</p>
                        <p className="text-3xl font-black tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          TOKEN # 03
                        </p>
                        <p className="text-xs font-semibold text-emerald-100 mt-0.5">
                          Dr. Waqar Khan • Today at 06:20 PM
                        </p>
                      </div>

                      <div className="w-16 h-16 bg-white rounded-xl p-1.5 flex items-center justify-center text-slate-900 shadow-xs flex-shrink-0">
                        <QrCode className="w-full h-full text-slate-900" />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/20 flex items-center justify-between text-[11px] text-emerald-100">
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0" /> Opposite DHQ Hospital, D.I. Khan
                      </span>
                      <span className="font-bold text-white shrink-0">Fee: Rs. 1,000</span>
                    </div>
                  </div>

                  {/* Live Queue Waiting Room Status Simulation */}
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Live Waiting Room TV Queue</p>
                        <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                          Now Serving: <span className="text-emerald-600 dark:text-emerald-400">Token #01</span> &middot; Your Token: <strong className="text-emerald-700 dark:text-emerald-300">#03</strong>
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-semibold text-slate-400 block">Estimated Wait</span>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        2 Patients (~12 mins)
                      </span>
                    </div>
                  </div>

                  {/* Navigation & Maps Pills */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold">
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 truncate shadow-2xs">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span className="truncate">SMS &amp; WhatsApp Sent</span>
                    </div>
                    <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 flex items-center gap-1.5 truncate shadow-2xs">
                      <ExternalLink className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                      <span className="truncate">Google Maps Route Ready</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Segmented Continuous Stories-Style Carousel Navigation Bar ── */}
      <div className="relative z-10 px-5 pb-8 sm:px-10 sm:pb-10 pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200/60 dark:border-slate-800/80">
        {/* Play/Pause & Step Jump Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playButtonClickSound(0.2);
              setIsAutoPlaying(!isAutoPlaying);
            }}
            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            title={isAutoPlaying ? 'Pause video walkthrough' : 'Resume video walkthrough'}
          >
            {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>

          <button
            onClick={() => handleStepJump((activeStep - 1 + steps.length) % steps.length)}
            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            title="Previous step"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleStepJump((activeStep + 1) % steps.length)}
            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            title="Next step"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* ── Segmented Continuous Stories-Style Morphing Pills ── */}
        <div className="inline-flex items-center gap-1.5 sm:gap-2.5 p-1.5 rounded-2xl sm:rounded-full bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/60 dark:border-slate-700/80 shadow-inner flex-wrap justify-center">
          {steps.map((st, idx) => {
            const isActive = activeStep === idx;
            const isPast = activeStep > idx;
            const fillWidth = isPast ? 100 : isActive ? progress : 0;
            const IconComp = st.icon;

            return (
              <button
                key={st.id}
                onClick={() => handleStepJump(idx)}
                className={`relative px-3 sm:px-4 py-2 rounded-xl sm:rounded-full transition-all duration-300 cursor-pointer overflow-hidden flex items-center gap-2 ${
                  isActive
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold shadow-md'
                    : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/80'
                }`}
                title={st.title}
              >
                <IconComp className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-xs font-bold whitespace-nowrap">{st.shortLabel}</span>

                {/* Continuous Fill Progress Line at the bottom of the pill */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 dark:from-emerald-600 dark:to-teal-500 transition-all duration-75"
                    style={{ width: `${fillWidth}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick Status */}
        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
          Step {activeStep + 1} of 4 • {isAutoPlaying ? 'Continuous live video simulation' : 'Paused (Click to navigate)'}
        </div>
      </div>
    </section>
  );
}
