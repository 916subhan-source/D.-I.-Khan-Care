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
  MousePointerClick
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
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);
  const progressTimerRef = useRef<any>(null);

  // Simulation interactive state for Slide 1
  const [simSpecialty, setSimSpecialty] = useState<string>('Cardiologist');
  // Simulation interactive state for Slide 2
  const [simDate, setSimDate] = useState<number>(0);
  const [simShift, setSimShift] = useState<'morning' | 'evening'>('morning');
  const [simSlot, setSimSlot] = useState<number>(2);

  const steps = [
    {
      id: 0,
      number: '01',
      title: 'Find Your Specialist',
      shortLabel: '1. Find Specialist',
      icon: Stethoscope,
      subtitle: 'Browse PMDC-verified doctors across Dera Ismail Khan',
      description:
        'Search top specialists by medical symptom, doctor name, or hospital location. View verified credentials, patient satisfaction reviews, clinic addresses, and consultation fees before booking.',
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
      title: 'Choose Date & Time Slot',
      shortLabel: '2. Select Slot',
      icon: Calendar,
      subtitle: 'Real-time morning and evening clinic slot availability',
      description:
        'Select your preferred consultation date and morning or evening session. Choose an exact 25-minute consultation slot. No crowded waiting rooms — your slot is held instantly with zero advance payment.',
      bullets: [
        'Real-time live slot calendar',
        'Morning & Evening shift choices',
        'Zero advance booking deposit required',
        'Direct cash payment upon clinic arrival'
      ],
      ctaText: 'View Available Timings',
      windowTitle: 'dikhancare.io/doctor/dr-waqar-khan/slots',
      statusBadge: 'Live Slot Matrix',
      statusColor: 'text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800'
    },
    {
      id: 2,
      number: '03',
      title: 'Digital Slip & Live Tracker',
      shortLabel: '3. Digital Token',
      icon: Ticket,
      subtitle: 'Instant token slip on SMS, WhatsApp & Live Clinic TV Queue',
      description:
        'Your digital appointment slip is generated instantly with your assigned token number, QR verification, and Google Maps clinic directions. Track the live queue on your phone so you only arrive when your turn is near.',
      bullets: [
        'Instant Slip # sent to WhatsApp & SMS',
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

  // Continuous Auto-advance carousel smoothly every 5.5 seconds
  useEffect(() => {
    if (!isAutoPlaying) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      return;
    }

    const duration = 5500;
    const interval = 40;
    let elapsed = 0;

    progressTimerRef.current = setInterval(() => {
      elapsed += interval;
      const currentPct = Math.min(100, (elapsed / duration) * 100);
      setProgress(currentPct);

      if (elapsed >= duration) {
        elapsed = 0;
        setProgress(0);
        setActiveStep((prev) => {
          const next = (prev + 1) % steps.length;
          playButtonClickSound(0.18);
          return next;
        });
      }
    }, interval);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [isAutoPlaying, activeStep]);

  const handleStepClick = (index: number) => {
    playButtonClickSound(0.24);
    setActiveStep(index);
    setProgress(0);
  };

  const currentStep = steps[activeStep];

  return (
    <section className="relative my-8 sm:my-14 overflow-hidden rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-gradient-to-b from-white via-slate-50/70 to-emerald-50/30 dark:from-slate-900 dark:via-[#071317] dark:to-slate-950 shadow-xl dark:shadow-2xl">
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
          <span>Interactive Patient Guide</span>
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
          From finding verified DHQ and private hospital specialists to holding an exact time slot and getting your WhatsApp digital token — explore the continuous simulation below.
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
                    transform: isActive ? 'scale(1) translateX(0)' : 'scale(0.96) translateX(10px)'
                  }}
                >
                  {/* Step Pill & Indicator */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black text-sm flex items-center justify-center shadow-md shadow-emerald-600/30">
                      {st.number}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        Step {st.number} of 03
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
                        if (activeStep === 2 && onTrackAppointment) {
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

        {/* ── Right Column: Continuous Fluid Sliding Mockup Screen ── */}
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

              {/* Browser Address Bar with Animated Transition */}
              <div className="flex-1 max-w-sm mx-auto px-3 py-1 bg-white dark:bg-slate-900/90 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-slate-600 dark:text-slate-300 truncate text-center shadow-2xs transition-colors duration-300">
                https://{currentStep.windowTitle}
              </div>

              {/* Status Badge */}
              <div
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 shrink-0 transition-colors duration-300 ${currentStep.statusColor}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                <span className="hidden sm:inline">{currentStep.statusBadge}</span>
              </div>
            </div>

            {/* Continuous Horizontal Sliding Track */}
            <div className="overflow-hidden relative w-full bg-slate-50/50 dark:bg-slate-950/40">
              <div
                className="flex w-full transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{ transform: `translateX(-${activeStep * 100}%)` }}
              >
                {/* ── Slide 1: Doctor Search & Selection ── */}
                <div
                  className="w-full shrink-0 p-4 sm:p-6 min-h-[380px] sm:min-h-[420px] flex flex-col justify-center space-y-4 transition-all duration-500"
                  style={{
                    opacity: activeStep === 0 ? 1 : 0.35,
                    transform: activeStep === 0 ? 'scale(1)' : 'scale(0.96)'
                  }}
                >
                  {/* Search Input Bar Mockup */}
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 shadow-xs">
                    <Search className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 flex-1">
                      Cardiologist in Dera Ismail Khan
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                      3 Doctors Found
                    </span>
                  </div>

                  {/* Specialty Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {['Cardiologist', 'Child Specialist', 'Gynecologist', 'General Physician'].map((sp) => (
                      <button
                        key={sp}
                        onClick={() => {
                          playButtonClickSound(0.2);
                          setSimSpecialty(sp);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                          simSpecialty === sp
                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {sp}
                      </button>
                    ))}
                  </div>

                  {/* Doctor Card Mockup (Selected with Animated Cursor Click Target) */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-800/90 border-2 border-emerald-500 shadow-md transition-all relative overflow-hidden">
                    <div className="flex items-start gap-3 sm:gap-4">
                      {/* Doctor Avatar */}
                      <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0">
                        <span>WK</span>
                        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-800" />
                      </div>

                      {/* Doctor Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                            Dr. Waqar Khan Gandapur
                          </h4>
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified
                          </span>
                        </div>

                        <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                          MBBS, FCPS Cardiology • Consultant Cardiologist
                        </p>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">Opposite DHQ Hospital Gate, D.I. Khan</span>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">Consultation Fee</span>
                            <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                              Rs. 1,000 <span className="text-[10px] text-emerald-600 font-bold">(Pay at Desk)</span>
                            </p>
                          </div>
                          <div className="relative">
                            <button
                              onClick={() => {
                                playButtonClickSound(0.24);
                                setActiveStep(1);
                                setProgress(0);
                              }}
                              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer relative z-10"
                            >
                              <span>Pick Slot</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                            {/* Animated Virtual Cursor Micro-Interaction */}
                            {activeStep === 0 && progress > 40 && progress < 85 && (
                              <div className="absolute -bottom-2 -right-2 pointer-events-none z-20 flex items-center gap-1 animate-bounce">
                                <span className="w-6 h-6 rounded-full bg-emerald-400/40 animate-ping absolute" />
                                <MousePointerClick className="w-5 h-5 text-emerald-700 dark:text-emerald-300 drop-shadow-md" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Slide 2: Live Date & Slot Picker ── */}
                <div
                  className="w-full shrink-0 p-4 sm:p-6 min-h-[380px] sm:min-h-[420px] flex flex-col justify-center space-y-4 transition-all duration-500"
                  style={{
                    opacity: activeStep === 1 ? 1 : 0.35,
                    transform: activeStep === 1 ? 'scale(1)' : 'scale(0.96)'
                  }}
                >
                  {/* Doctor Mini-header */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                        WK
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Dr. Waqar Khan Gandapur</p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Cardiology Clinic</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      25 Min Consultation
                    </span>
                  </div>

                  {/* Day Selector */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Select Date:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { day: 'Today', date: 'Nov 20', slots: '6 Slots' },
                        { day: 'Tomorrow', date: 'Nov 21', slots: '12 Slots' },
                        { day: 'Saturday', date: 'Nov 22', slots: '10 Slots' }
                      ].map((d, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            playButtonClickSound(0.2);
                            setSimDate(idx);
                          }}
                          className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                            simDate === idx
                              ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold shadow-xs'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                          }`}
                        >
                          <p className="text-xs font-bold">{d.day}</p>
                          <p className="text-[10px] opacity-75">{d.date}</p>
                          <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                            {d.slots}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Shift Selector */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        playButtonClickSound(0.2);
                        setSimShift('morning');
                      }}
                      className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        simShift === 'morning'
                          ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span>☀️ Morning (09:00 - 01:00)</span>
                    </button>
                    <button
                      onClick={() => {
                        playButtonClickSound(0.2);
                        setSimShift('evening');
                      }}
                      className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        simShift === 'evening'
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span>🌙 Evening (05:00 - 09:00)</span>
                    </button>
                  </div>

                  {/* Available Time Slots Grid */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Available Time Slots:
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { time: '09:00 AM', status: 'taken', token: '#01' },
                        { time: '09:25 AM', status: 'taken', token: '#02' },
                        { time: '09:50 AM', status: 'available', token: '#03' },
                        { time: '10:15 AM', status: 'available', token: '#04' }
                      ].map((s, idx) => (
                        <button
                          key={idx}
                          disabled={s.status === 'taken'}
                          onClick={() => {
                            playButtonClickSound(0.2);
                            setSimSlot(idx);
                          }}
                          className={`p-2 rounded-xl border text-center transition-all relative ${
                            s.status === 'taken'
                              ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 border-slate-200/60 dark:border-slate-800 opacity-60 cursor-not-allowed line-through'
                              : simSlot === idx
                              ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-md ring-2 ring-emerald-400/30'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-emerald-500 cursor-pointer'
                          }`}
                        >
                          <p className="text-[11px] font-bold">{s.time}</p>
                          <p className="text-[9px] mt-0.5 opacity-90">{s.status === 'taken' ? 'Booked' : s.token}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Summary Bar */}
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between relative overflow-hidden">
                    <span className="text-xs text-emerald-900 dark:text-emerald-200 font-semibold">
                      Selected Slot: <strong>09:50 AM (Token #03)</strong>
                    </span>
                    <button
                      onClick={() => {
                        playButtonClickSound(0.25);
                        setActiveStep(2);
                        setProgress(0);
                      }}
                      className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xs"
                    >
                      <span>Confirm Slip</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                    {/* Simulated Finger Click on Slide 2 */}
                    {activeStep === 1 && progress > 55 && progress < 90 && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none z-20 flex items-center gap-1 animate-pulse">
                        <span className="w-7 h-7 rounded-full bg-emerald-400/40 animate-ping absolute" />
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Slide 3: Digital Slip & Live Queue Tracking ── */}
                <div
                  className="w-full shrink-0 p-4 sm:p-6 min-h-[380px] sm:min-h-[420px] flex flex-col justify-center space-y-3.5 transition-all duration-500"
                  style={{
                    opacity: activeStep === 2 ? 1 : 0.35,
                    transform: activeStep === 2 ? 'scale(1)' : 'scale(0.96)'
                  }}
                >
                  {/* Digital Slip Receipt Card */}
                  <div className="relative p-4 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-clinic-900 text-white shadow-lg overflow-hidden transform transition-transform duration-500 hover:scale-[1.01]">
                    <div className="flex items-center justify-between pb-3 border-b border-white/20">
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

                    <div className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-emerald-200">Patient Consultation Token</p>
                        <p className="text-3xl font-black tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          TOKEN # 04
                        </p>
                        <p className="text-xs font-semibold text-emerald-100 mt-0.5">
                          Dr. Waqar Khan • Today at 10:15 AM
                        </p>
                      </div>

                      <div className="w-16 h-16 bg-white rounded-xl p-1.5 flex items-center justify-center text-slate-900 shadow-xs flex-shrink-0">
                        <QrCode className="w-full h-full text-slate-900" />
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-white/20 flex items-center justify-between text-[11px] text-emerald-100">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-300" /> Opposite DHQ Hospital, D.I. Khan
                      </span>
                      <span className="font-bold text-white">Fee: Rs. 1,000</span>
                    </div>
                  </div>

                  {/* Live Queue Waiting Room Status Simulation */}
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Live Queue in Clinic</p>
                        <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                          Now Serving: <span className="text-emerald-600 dark:text-emerald-400">Token #02</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-semibold text-slate-400 block">Estimated Wait</span>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        2 Patients (~15 mins)
                      </span>
                    </div>
                  </div>

                  {/* Delivery notification pills */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold">
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 truncate shadow-2xs">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span className="truncate">SMS &amp; WhatsApp Sent</span>
                    </div>
                    <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 flex items-center gap-1.5 truncate shadow-2xs">
                      <ExternalLink className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                      <span className="truncate">Google Maps Link Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Segmented Continuous Carousel Navigation Bar (Exactly like XPEREOZZ) ── */}
      <div className="relative z-10 px-5 pb-8 sm:px-10 sm:pb-10 pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200/60 dark:border-slate-800/80">
        {/* Play/Pause & Step Jump Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playButtonClickSound(0.2);
              setIsAutoPlaying(!isAutoPlaying);
            }}
            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            title={isAutoPlaying ? 'Pause automatic preview' : 'Play automatic preview'}
          >
            {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>

          <button
            onClick={() => handleStepClick((activeStep - 1 + steps.length) % steps.length)}
            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            title="Previous step"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleStepClick((activeStep + 1) % steps.length)}
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
                onClick={() => handleStepClick(idx)}
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

        {/* Quick Hint */}
        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
          Step {activeStep + 1} of 3 • {isAutoPlaying ? 'Continuous flexible preview' : 'Paused (Click to navigate)'}
        </div>
      </div>
    </section>
  );
}
