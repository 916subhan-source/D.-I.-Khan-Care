import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, VolumeX, Maximize, Minimize, ArrowLeft, 
  Clock, Users, CheckCircle2, ChevronDown, Stethoscope,
  Sparkles, RefreshCw, Radio, Bell
} from 'lucide-react';
import { apiFetch } from '../lib/api';

interface LiveQueueDoctor {
  id: string;
  name: string;
  specialty: string;
  qualification?: string;
  clinic_name?: string;
  clinic_address?: string;
  fee?: number;
}

interface QueueToken {
  token_number: number;
  patient_name: string;
  slip_number?: string;
  status: string;
  time?: string;
}

interface LiveQueueData {
  doctor: LiveQueueDoctor | null;
  now_serving: QueueToken | null;
  upcoming: QueueToken[];
  stats: {
    total: number;
    completed: number;
    waiting: number;
  };
  server_time_pkt?: string;
  server_date_pkt?: string;
}

export default function QueueDisplay({
  onBack,
  defaultDoctorId
}: {
  onBack: () => void;
  defaultDoctorId?: string;
}) {
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('doctor') || defaultDoctorId || '';
    } catch {
      return defaultDoctorId || '';
    }
  });

  const [queueData, setQueueData] = useState<LiveQueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [currentDateStr, setCurrentDateStr] = useState('');
  const [lastAnnouncedToken, setLastAnnouncedToken] = useState<number | null>(null);
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [isChiming, setIsChiming] = useState(false);

  // Audio chime using pure Web Audio API (zero external assets, 100% offline safe)
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Note 1: E5 (659.25Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.55);

      // Note 2: C5 (523.25Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(523.25, now + 0.22);
      gain2.gain.setValueAtTime(0.4, now + 0.22);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.22);
      osc2.stop(now + 0.85);

      setIsChiming(true);
      setTimeout(() => setIsChiming(false), 1200);
    } catch (e) {
      console.warn('Audio chime playback blocked or unavailable', e);
    }
  };

  // Live PKT Digital Clock ticking every second
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      // Format Pakistan Time (PKT)
      const timeStr = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Karachi',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      const dateStr = now.toLocaleDateString('en-PK', {
        timeZone: 'Asia/Karachi',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      setCurrentTimeStr(timeStr);
      setCurrentDateStr(dateStr);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch doctors list for clinic switcher
  useEffect(() => {
    let isMounted = true;
    apiFetch<any[]>('/doctors')
      .then((docs) => {
        if (!isMounted || !Array.isArray(docs)) return;
        setDoctorsList(docs);
        if (!selectedDoctorId && docs.length > 0) {
          setSelectedDoctorId(docs[0].id);
        }
      })
      .catch((err) => console.warn('Could not load doctors list', err));
    return () => { isMounted = false; };
  }, []);

  // Poll live queue every 10 seconds
  const fetchQueue = async () => {
    try {
      const endpoint = selectedDoctorId 
        ? `/booking/live-queue?doctor_id=${selectedDoctorId}` 
        : '/booking/live-queue';
      const data = await apiFetch<LiveQueueData>(endpoint);
      if (data) {
        setQueueData(data);
        const currentServingNum = data.now_serving?.token_number;
        if (currentServingNum !== undefined && currentServingNum !== null) {
          if (lastAnnouncedToken !== null && currentServingNum !== lastAnnouncedToken) {
            if (audioEnabled) {
              playChime();
            }
          }
          setLastAnnouncedToken(currentServingNum);
        }
      }
    } catch (e) {
      console.warn('Queue live fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 10000);
    return () => clearInterval(interval);
  }, [selectedDoctorId, audioEnabled, lastAnnouncedToken]);

  // Fullscreen management
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Fallback demo tokens if database has no active appointments today yet
  const activeDoctor = queueData?.doctor || (doctorsList.find(d => d.id === selectedDoctorId) ? {
    id: selectedDoctorId,
    name: doctorsList.find(d => d.id === selectedDoctorId)?.full_name || 'Specialist Doctor',
    specialty: doctorsList.find(d => d.id === selectedDoctorId)?.specialty || 'Medical Specialist',
    clinic_name: doctorsList.find(d => d.id === selectedDoctorId)?.sub_region || 'D.I. Khan Clinic',
    clinic_address: doctorsList.find(d => d.id === selectedDoctorId)?.clinic_address || 'Opposite DHQ Hospital, Dera Ismail Khan'
  } : null);

  const displayNowServing = queueData?.now_serving || null;

  const displayUpcoming = (queueData?.upcoming && queueData.upcoming.length > 0)
    ? queueData.upcoming
    : [];

  const totalPatients = queueData?.stats?.total ?? 0;
  const completedPatients = queueData?.stats?.completed ?? 0;
  const waitingPatients = queueData?.stats?.waiting ?? 0;

  return (
    <div className="min-h-screen bg-[#070d18] text-white flex flex-col justify-between selection:bg-emerald-500 selection:text-white font-sans overflow-x-hidden">
      {/* Top TV Header Bar */}
      <header className="border-b border-slate-800/80 bg-[#0b1324]/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 z-20">
        {/* Brand & Live Indicator */}
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Exit to Portal Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-black text-white shadow-lg shadow-emerald-950/40 text-sm">
              DIK
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                  D.I. Khan Care
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-950/80 border border-emerald-500/50 text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  LIVE KIOSK
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Waiting Room Live Queue Display
              </p>
            </div>
          </div>
        </div>

        {/* Doctor Selector Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowDoctorDropdown(!showDoctorDropdown)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-xs sm:text-sm font-bold text-emerald-300 transition-all cursor-pointer"
          >
            <Stethoscope className="w-4 h-4 text-emerald-400" />
            <span className="truncate max-w-[200px] sm:max-w-[260px]">
              {activeDoctor?.name || 'Select Clinic Doctor'}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {showDoctorDropdown && (
            <div className="absolute right-0 top-full mt-2 w-72 max-h-72 overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 p-2 space-y-1">
              {doctorsList.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => {
                    setSelectedDoctorId(doc.id);
                    setShowDoctorDropdown(false);
                    try {
                      const url = new URL(window.location.href);
                      url.searchParams.set('doctor', doc.id);
                      window.history.pushState({}, '', url.toString());
                    } catch {}
                  }}
                  className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors flex flex-col cursor-pointer ${
                    selectedDoctorId === doc.id
                      ? 'bg-emerald-950/70 border border-emerald-600/60 text-emerald-200'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <span className="font-bold">{doc.full_name}</span>
                  <span className="text-[11px] text-slate-400">{doc.specialty} &bull; {doc.sub_region}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Audio, Clock & Fullscreen Controls */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !audioEnabled;
              setAudioEnabled(next);
              if (next) playChime();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              audioEnabled
                ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title={audioEnabled ? 'Sound Chime Enabled' : 'Click to Enable Audio Chime'}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{audioEnabled ? 'Chime ON' : 'Muted'}</span>
          </button>

          {/* Live PKT Clock */}
          <div className="text-right">
            <div className="font-mono font-black text-sm sm:text-base text-emerald-400 tracking-wider">
              {currentTimeStr || '00:00:00 PKT'}
            </div>
            <div className="text-[10px] text-slate-400 truncate max-w-[170px]">
              {currentDateStr || 'Pakistan Standard Time'}
            </div>
          </div>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen TV Mode'}
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Kiosk Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 flex flex-col justify-center">
        {/* Doctor Clinic Banner */}
        <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-[#0d1829] border border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-0.5 shadow-lg shadow-emerald-950/60">
              <div className="w-full h-full bg-[#0b1324] rounded-[14px] flex items-center justify-center">
                <Stethoscope className="w-7 h-7 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {activeDoctor?.name || 'Dr. Specialist'}
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-teal-950/90 border border-teal-500/60 text-teal-300">
                  {activeDoctor?.specialty || 'General OPD'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                📍 {activeDoctor?.clinic_address || 'Opposite DHQ Hospital, D.I. Khan'}
              </p>
            </div>
          </div>

          {/* Test Chime / Staff Trigger */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={playChime}
              className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-emerald-950/60 border border-slate-700 hover:border-emerald-600 text-xs font-bold text-slate-200 hover:text-emerald-300 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-emerald-400" />
              <span>Test Chime (گھنٹی)</span>
            </button>
            <button
              type="button"
              onClick={fetchQueue}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Refresh Queue"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Central Display Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
          {/* NOW SERVING HERO CARD (Left 7 cols) */}
          <div className={`lg:col-span-7 rounded-3xl bg-gradient-to-b from-[#0f2320] via-[#0c1926] to-[#08101a] border-2 transition-all duration-500 p-6 sm:p-10 flex flex-col justify-between shadow-2xl relative overflow-hidden ${
            isChiming ? 'border-emerald-400 ring-4 ring-emerald-500/30' : 'border-emerald-500/60 shadow-emerald-950/40'
          }`}>
            {/* Top Glow Ornament */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div>
              {/* Header Badges */}
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-widest">
                  <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  CONSULTATION IN PROGRESS
                </span>
                <span dir="rtl" className="font-urdu-hero text-sm font-bold text-emerald-300">
                  ابھی کمرہ معائنہ میں حاضر ہوں
                </span>
              </div>

              {/* Title Section */}
              <h3 className="text-slate-400 text-xs sm:text-sm font-bold uppercase tracking-widest">
                NOW SERVING &bull; ابھی بلایا جا رہا ہے
              </h3>

              {/* Giant Token Number */}
              <div className="my-6 sm:my-8 text-center">
                <div className="inline-block relative">
                  <div className="text-[5.5rem] sm:text-[7.5rem] md:text-[8.5rem] font-black leading-none tracking-tight font-mono text-white drop-shadow-[0_10px_25px_rgba(16,185,129,0.35)]">
                    {displayNowServing ? `#${String(displayNowServing.token_number).padStart(2, '0')}` : '--'}
                  </div>
                  <span className="absolute -bottom-2 right-0 left-0 text-center text-xs sm:text-sm font-extrabold uppercase tracking-widest text-emerald-400">
                    {displayNowServing ? 'TOKEN NUMBER' : 'NO PATIENT IN ROOM'}
                  </span>
                </div>
              </div>
            </div>

            {/* Patient Name & Status Banner */}
            <div className="bg-[#070f1a]/80 border border-emerald-900/60 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                  {displayNowServing ? 'Patient Calling' : 'Consultation Desk'}
                </span>
                <p className="text-base sm:text-xl font-extrabold text-white truncate">
                  {displayNowServing?.patient_name || 'Waiting for next patient check-in'}
                </p>
              </div>

              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs sm:text-sm font-extrabold whitespace-nowrap">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{displayNowServing ? 'With Doctor' : 'Desk Ready'}</span>
              </div>
            </div>
          </div>

          {/* UPCOMING QUEUE COLUMN (Right 5 cols) */}
          <div className="lg:col-span-5 rounded-3xl bg-[#0b1324] border border-slate-800 p-6 sm:p-8 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                <div>
                  <h4 className="text-base font-extrabold text-white">
                    NEXT UP (اگلے مریض)
                  </h4>
                  <p className="text-xs text-slate-400">
                    Please be seated near Room # 1
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-mono font-bold text-emerald-400 border border-slate-700">
                  {displayUpcoming.length} Waiting
                </span>
              </div>

              {/* Upcoming List */}
              <div className="space-y-3">
                {displayUpcoming.length > 0 ? (
                  displayUpcoming.map((item, idx) => (
                    <div
                      key={item.token_number || idx}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        idx === 0
                          ? 'bg-emerald-950/40 border-emerald-600/70 shadow-md shadow-emerald-950/20'
                          : 'bg-slate-900/70 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-black text-sm ${
                          idx === 0
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          #{String(item.token_number).padStart(2, '0')}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-slate-200 truncate">
                            {item.patient_name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {idx === 0 ? '👉 Next in Line' : `Est. wait: ~${(idx + 1) * 10} mins`}
                          </p>
                        </div>
                      </div>

                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        idx === 0
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {idx === 0 ? 'Ready' : 'In Queue'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-10 text-center text-slate-500 text-xs font-semibold">
                    No waiting tokens in queue at this time.
                  </div>
                )}
              </div>
            </div>

            {/* Politeness Note */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
              <p dir="rtl" className="font-urdu-hero text-xs text-slate-400">
                برائے مہربانی اپنا ڈیجیٹل سلپ نمبر کاؤنٹر پر دکھائیں اور اعلان کا انتظار فرمائیں۔
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Ticker & Stats Bar */}
      <footer className="border-t border-slate-800 bg-[#09101d] px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-4 z-20">
        {/* Scrolling Urdu/English Announcement Marquee */}
        <div className="flex-1 min-w-[280px] overflow-hidden whitespace-nowrap">
          <div className="inline-flex items-center gap-6 text-xs text-slate-300">
            <span className="font-bold text-emerald-400">📢 Announcement:</span>
            <span>Welcome to D.I. Khan Care Clinic</span>
            <span className="text-slate-600">&bull;</span>
            <span dir="rtl" className="font-urdu-hero text-slate-200">
              براہ کرم کاؤنٹر پر اپنا ٹوکن سلپ دکھائیں اور اپنی باری کا انتظار فرمائیں
            </span>
            <span className="text-slate-600">&bull;</span>
            <span>Emergency and elderly patients receive priority consultation</span>
          </div>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>Today's Tokens:</span>
            <span className="font-mono font-bold text-white">{totalPatients}</span>
          </div>
          <div className="text-slate-700">|</div>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Attended:</span>
            <span className="font-mono font-bold text-white">{completedPatients}</span>
          </div>
          <div className="text-slate-700">|</div>
          <div className="flex items-center gap-1.5 text-amber-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Waiting:</span>
            <span className="font-mono font-bold text-white">{waitingPatients}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
