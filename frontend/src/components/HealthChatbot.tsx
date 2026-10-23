import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  RotateCcw,
  AlertTriangle,
  Stethoscope,
  Heart,
  Baby,
  Activity,
  Flame,
  Award,
  Search
} from 'lucide-react';

export interface ChatbotDoctorData {
  id: string;
  user_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  specialty: string;
  sub_region: string;
  clinic_address: string;
  google_maps_url?: string;
  fee_clinic: number;
  shift: string;
  morning_start?: string;
  morning_end?: string;
  evening_start?: string;
  evening_end?: string;
  is_spotlight: boolean;
  verification_status: string;
  qualification?: string;
  bio?: string;
  profile_image?: string;
  off_days?: string;
  expertise?: string;
  experience_years?: number;
}

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  recommendedDoctors?: ChatbotDoctorData[];
  matchedSpecialty?: string;
  timestamp: string;
}

interface HealthChatbotProps {
  doctors: ChatbotDoctorData[];
  onBook: (doctor: ChatbotDoctorData) => void;
  onProfile?: (doctor: ChatbotDoctorData) => void;
  onTrack?: () => void;
}

const QUICK_CHIPS = [
  { id: 'track', label: 'Appointment Trace / Dekhein', icon: Clock, query: 'Appointment kaisey dekhen ya trace karen?' },
  { id: 'booking', label: 'Appointment Kaise Book Karein?', icon: Calendar, query: 'Appointment book kaise karen?' },
  { id: 'ent', label: 'Kaan, Naak & Gala (ENT)', icon: Stethoscope, query: 'Kaan me shadeed dard hai naak aur gala kharab hai' },
  { id: 'heart', label: 'Dil & Seene ka Dard', icon: Heart, query: 'Mujhe seene me dard aur sans phoolne ka masla hai' },
  { id: 'child', label: 'Bachon ki Bimari & Bukhar', icon: Baby, query: 'Chote bache ko shadeed bukhar aur ulti hai' },
  { id: 'gynae', label: 'Khwateen ke Amraz', icon: Activity, query: 'Khwateen ke masle aur pregnancy ke liye lady doctor chahiye' },
  { id: 'sugar', label: 'Sugar & Blood Pressure', icon: Activity, query: 'Sugar aur blood pressure check karwana hai kamzori mehsoos ho rahi hai' },
  { id: 'stomach', label: 'Meda, Gas & Hazma', icon: Flame, query: 'Mede me jalan, gas aur pait me shadeed dard hai' },
  { id: 'bones', label: 'Jodon aur Kamar ka Dard', icon: Stethoscope, query: 'Jodon aur kamar me shadeed dard hai chalne me takleef hai' }
];

// Helper to match words or phrases with regex word boundaries to prevent false positives (e.g. 'heart' matching 'ear')
const hasWord = (text: string, patterns: string[]): boolean => {
  return patterns.some(p => {
    if (p.includes(' ')) {
      return text.includes(p);
    }
    const rx = new RegExp(`\\b${p}\\b`, 'i');
    return rx.test(text);
  });
};

export const HealthChatbot: React.FC<HealthChatbotProps> = ({ doctors, onBook, onProfile, onTrack }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasUnreadAlert, setHasUnreadAlert] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationHistoryRef = useRef<Array<{ role: string; parts: Array<{ text: string }> }>>([]);

  const initialBotMessage: Message = {
    id: 'welcome_1',
    sender: 'bot',
    text: "Assalam-o-Alaikum! Main D.I. Khan Care ka AI Health Assistant hoon. 🤖✨\n\nAap apni bimari ya symptoms **Roman Urdu** ya **English** me likhein (jaise: *'kaan me dard'*, *'seene me dard'*, *'bacha beemar hai'*, *'khwateen ke amraz'*, ya *'sugar'*). Main aapko mutaliqa makhsoos specialist doctor recommend karunga.\n\n🧠 Powered by Google Gemini AI",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  const [messages, setMessages] = useState<Message[]>([initialBotMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasUnreadAlert(false);
    }
  }, [messages, isOpen]);

  // ── Gemini API Call ──
  const callGeminiAPI = async (userMessage: string): Promise<string> => {
    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: conversationHistoryRef.current.slice(-10), // Last 10 messages for context
        }),
      });

      if (!res.ok) {
        console.error('Gemini API error:', res.status);
        return '';
      }

      const data = await res.json();
      return data.reply || '';
    } catch (err) {
      console.error('Gemini API call failed:', err);
      return '';
    }
  };

  // ── Check if query is a procedural/platform intent (handled locally) ──
  const getProceduralResponse = (query: string): { advice: string; specialty: string; doctors: ChatbotDoctorData[] } | null => {
    const q = query.toLowerCase().trim();

    // A. APPOINTMENT TRACE / STATUS
    const isTrackOrStatus = hasWord(q, [
      'trace', 'track', 'tracking', 'dekhen', 'dekhein', 'dekhna', 'dekhne', 'kahan pohnchi',
      'status', 'check', 'slip', 'token', 'cancel', 'cancellation', 'delete appointment',
      'mera appointment', 'meri appointment', 'meri booking', 'reschedule', 'pata karen', 'maloom'
    ]) || q.includes('trace') || q.includes('track');

    if (isTrackOrStatus) {
      return {
        advice: "**Appointment Trace ya Status Check karne ka tareeqa:**\n1️⃣ Website ke top par **'Track Visit'** / **'Counter Guidelines'** par click karein (ya neeche diye gaye button par click karein).\n2️⃣ Apna **Mobile / WhatsApp Number** ya **Digital Slip Number** (e.g. DIK-...) darj karein.\n3️⃣ **'Find Appointment'** dabayein.\n\n✅ Aapko apna live status (Confirmed, Token Number, Doctor Timing aur Digital Slip) foran nazar aa jayega.",
        specialty: 'Appointment Status',
        doctors: []
      };
    }

    // B. APPOINTMENT BOOKING
    const hasBookingWord = hasWord(q, [
      'appointment', 'appoitement', 'appoinment', 'apointment', 'booking', 'book'
    ]);
    const hasBookingAction = hasWord(q, [
      'kaise', 'kaisey', 'kese', 'tarika', 'tareeqa', 'karna', 'karni', 'krna', 'krni',
      'kari', 'karwa', 'karwani', 'karwana', 'krwani', 'krwana', 'leni', 'lena', 'karen',
      'karein', 'karo', 'how', 'hogi', 'hoga', 'step', 'steps', 'process', 'help',
      'chahiye', 'chahta', 'chahti', 'schedule', 'kahan', 'kidhar', 'hai', 'kare', 'len'
    ]);
    const isBookingHelp = (hasBookingWord && hasBookingAction) ||
      q.includes('book') || q.includes('booking') || q.includes('appointment') || q.includes('appoitement') || q.includes('apointment');

    if (isBookingHelp) {
      return {
        advice: "**Appointment book karne ka aasan tareeqa:**\n1️⃣ Neeche diye gaye doctors me se mutaliqa doctor ke card par **'Book Appointment'** button dabayein.\n2️⃣ Apni marzi ki **Tareekh (Date)** aur **Time Slot** muntakhib karein.\n3️⃣ Apna **Naam** aur **Mobile Number** darj karein.\n\n✅ Verification SMS ke baad appointment confirm ho jayegi. Fees clinic par **Cash** deni hoti hai.",
        specialty: 'Booking Guide',
        doctors: []
      };
    }

    // C. FEES & PAYMENT
    const isFeesHelp = hasWord(q, [
      'fee', 'fees', 'charges', 'kitni fee', 'fees kitni', 'kitne paise', 'paise', 'pese',
      'payment', 'cash', 'jazzcash', 'easypaisa', 'online payment', 'fee structure'
    ]);
    if (isFeesHelp) {
      return {
        advice: "**Fees aur Payment ki maloomat:**\n- Har doctor ki consultation fee unke profile card par likhi hoti hai (e.g. Rs. 1,000 - Rs. 1,500).\n- **Payment Method:** Fees clinic par reception counter par **Cash** jama karwani hoti hai.",
        specialty: 'Payment Info',
        doctors: []
      };
    }

    // D. TIMINGS
    const isTimingHelp = hasWord(q, [
      'timing', 'timings', 'clinic time', 'kab open', 'kab baithte', 'kis waqt', 'schedule', 'chutti', 'off day', 'subah', 'sham'
    ]);
    if (isTimingHelp) {
      return {
        advice: "**Doctor Clinic Timings:**\n- Har doctor ke clinic ke auqaat (Morning ya Evening) aur active days unke profile par darj hain.\n- 'Book Appointment' dabane par aap active dates aur free slots dekh sakte hain.",
        specialty: 'Clinic Timings',
        doctors: []
      };
    }

    // E. GREETINGS
    const isGreeting = hasWord(q, [
      'salam', 'assalam', 'aslam', 'slam', 'hello', 'hi', 'hey', 'kya hal', 'kaise ho', 'shukriya', 'thanks', 'thank you'
    ]);
    if (isGreeting) {
      return {
        advice: "Walaikum Assalam! Main D.I. Khan Care ka AI assistant hoon. 🤖\n\n- Kisi bimari ke ilaj ke liye apni alamat likhein (jaise *'dil me dard'*, *'sugar'*, *'bachon ka bukhar'*).\n- Ya poochein ke appointment kaise book ya trace karein.",
        specialty: 'Assistant',
        doctors: []
      };
    }

    return null; // Not a procedural intent → use Gemini AI
  };

  // ── Match doctors from local database based on specialty keyword ──
  const matchDoctorsBySpecialty = (aiReply: string): { doctors: ChatbotDoctorData[]; specialty: string } => {
    const reply = aiReply.toLowerCase();

    const specialtyMap: Array<{ keywords: string[]; dbKeyword: string; label: string; unavailable: boolean }> = [
      { keywords: ['cardiologist', 'cardio', 'dil', 'heart', 'chest', 'bp', 'blood pressure'], dbKeyword: 'Cardio', label: 'Cardiologist', unavailable: false },
      { keywords: ['pediatrician', 'pediatric', 'child specialist', 'bachon', 'bacho'], dbKeyword: 'Pediatric', label: 'Pediatrician', unavailable: false },
      { keywords: ['gynecologist', 'gynae', 'gyneco', 'khwateen', 'lady doctor', 'pregnancy'], dbKeyword: 'Gynec', label: 'Gynecologist', unavailable: false },
      { keywords: ['ent', 'ear nose throat', 'kaan naak gala'], dbKeyword: 'ENT', label: 'ENT', unavailable: true },
      { keywords: ['orthopedic', 'ortho', 'haddi', 'jodon', 'kamar', 'bone'], dbKeyword: 'Orthopedic', label: 'Orthopedic', unavailable: true },
      { keywords: ['ophthalmologist', 'eye specialist', 'aankh'], dbKeyword: 'Eye', label: 'Ophthalmologist', unavailable: true },
      { keywords: ['dentist', 'dental', 'daant'], dbKeyword: 'Dental', label: 'Dentist', unavailable: true },
      { keywords: ['dermatologist', 'skin', 'jild'], dbKeyword: 'Skin', label: 'Dermatologist', unavailable: true },
      { keywords: ['neurologist', 'neuro', 'dimagh'], dbKeyword: 'Neuro', label: 'Neurologist', unavailable: true },
      { keywords: ['urologist', 'urology', 'gurda', 'kidney'], dbKeyword: 'Urology', label: 'Urologist', unavailable: true },
      { keywords: ['gastroenterologist', 'gastro', 'meda', 'stomach'], dbKeyword: 'Gastro', label: 'Gastroenterologist', unavailable: true },
    ];

    for (const spec of specialtyMap) {
      if (spec.keywords.some(kw => reply.includes(kw))) {
        if (spec.unavailable) {
          return { doctors: [], specialty: spec.label };
        }
        const matched = doctors.filter(doc => {
          const s = (doc.specialty || '').toLowerCase();
          const b = (doc.bio || '').toLowerCase();
          const e = (doc.expertise || '').toLowerCase();
          const k = spec.dbKeyword.toLowerCase();
          return s.includes(k) || b.includes(k) || e.includes(k);
        }).sort((a, b) => (a.is_spotlight === b.is_spotlight ? 0 : a.is_spotlight ? -1 : 1));
        return { doctors: matched.slice(0, 3), specialty: spec.label };
      }
    }

    return { doctors: [], specialty: 'General' };
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    const userMsg: Message = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Check procedural intents first (instant, no API call needed)
    const proceduralResult = getProceduralResponse(query);
    if (proceduralResult) {
      setTimeout(() => {
        const botMsg: Message = {
          id: `bot_${Date.now()}`,
          sender: 'bot',
          text: proceduralResult.advice,
          recommendedDoctors: proceduralResult.doctors,
          matchedSpecialty: proceduralResult.specialty,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botMsg]);
        setIsTyping(false);
      }, 400);
      return;
    }

    // For all other queries → call Gemini AI
    try {
      // Add user message to conversation history
      conversationHistoryRef.current.push({ role: 'user', parts: [{ text: query }] });

      const aiReply = await callGeminiAPI(query);

      if (aiReply) {
        // Add AI response to conversation history
        conversationHistoryRef.current.push({ role: 'model', parts: [{ text: aiReply }] });

        // Match doctors from the AI's recommendation
        const { doctors: matchedDocs, specialty } = matchDoctorsBySpecialty(aiReply);

        const botMsg: Message = {
          id: `bot_${Date.now()}`,
          sender: 'bot',
          text: aiReply,
          recommendedDoctors: matchedDocs,
          matchedSpecialty: specialty,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botMsg]);
      } else {
        // Fallback if Gemini API fails
        const botMsg: Message = {
          id: `bot_${Date.now()}`,
          sender: 'bot',
          text: "Muafi chahta hoon, abhi AI se jawab lene me mushkil ho rahi hai. Baraaye meherbani apni bimari ka naam likhein ya neeche diye gaye Quick Symptoms buttons use karein.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botMsg]);
      }
    } catch {
      const botMsg: Message = {
        id: `bot_${Date.now()}`,
        sender: 'bot',
        text: "Network error — baraaye meherbani internet connection check karein aur dobara koshish karein.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleResetChat = () => {
    setMessages([initialBotMessage]);
  };

  return (
    <>
      {/* ── Floating Action Trigger Button ── */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end">
        {/* Animated Tooltip Bubble when closed */}
        {!isOpen && hasUnreadAlert && (
          <div className="mb-2.5 bg-slate-900/95 text-white text-xs px-3.5 py-1.5 rounded-2xl shadow-xl border border-slate-700/80 backdrop-blur-md flex items-center gap-2 animate-bounce">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-medium text-[11px] sm:text-xs">
              Doctor ki zaroorat hai? <strong className="text-amber-300">Yahan poochein!</strong>
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); setHasUnreadAlert(false); }}
              className="text-slate-400 hover:text-white ml-1 text-xs"
              title="Close notification"
            >
              &times;
            </button>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-3.5 sm:p-4 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center ${
            isOpen
              ? 'bg-slate-800 text-white hover:bg-slate-900 rotate-90'
              : 'bg-gradient-to-r from-clinic-600 via-clinic-700 to-clinic-800 text-white hover:scale-105 hover:shadow-clinic-700/50'
          }`}
          aria-label="Open AI Health Assistant"
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <>
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
              </span>
              <Bot className="w-6 h-6" />
            </>
          )}
        </button>
      </div>

      {/* ── Slide-up / Pop-up Chat Modal ── */}
      {isOpen && (
        <div className="fixed top-16 sm:top-20 bottom-20 sm:bottom-24 right-3 sm:right-6 w-[calc(100vw-24px)] sm:w-[420px] max-h-[620px] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-clinic-900 to-slate-900 px-4 py-3.5 text-white flex items-center justify-between shadow-md flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-clinic-600/90 border border-clinic-400/40 flex items-center justify-center text-white shadow-inner">
                <Bot className="w-5 h-5 text-clinic-200" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-sm tracking-tight">D.I. Khan Care AI</h3>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded-full border border-emerald-500/40">
                    Online
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">Doctor Recommendation Assistant</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                title="Reset conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                title="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick-Action Chips Carousel */}
          <div className="bg-slate-50 border-b border-slate-200/70 p-2.5 flex-shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 px-1">
              Quick Symptoms (Roman Urdu):
            </span>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {QUICK_CHIPS.map(chip => (
                <button
                  key={chip.id}
                  onClick={() => handleSendMessage(chip.query)}
                  className="whitespace-nowrap px-2.5 py-1 rounded-xl bg-white border border-slate-200 hover:border-clinic-500 hover:bg-clinic-50/60 text-slate-700 hover:text-clinic-800 text-[11px] font-semibold transition-all shadow-2xs flex items-center gap-1.5 flex-shrink-0"
                >
                  <chip.icon className="w-3 h-3 text-clinic-600" />
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'bot' && (
                  <div className="w-7 h-7 rounded-xl bg-clinic-700 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-[85%] space-y-2.5 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  {/* Bubble text */}
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-clinic-700 text-white rounded-tr-xs shadow-sm font-medium'
                        : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs shadow-xs'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                    <span
                      className={`text-[9px] block text-right mt-1 font-mono ${
                        msg.sender === 'user' ? 'text-clinic-200' : 'text-slate-400'
                      }`}
                    >
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Direct Action Button for Appointment Status / Tracking */}
                  {msg.matchedSpecialty === 'Appointment Status' && onTrack && (
                    <button
                      onClick={() => {
                        onTrack();
                        setIsOpen(false);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-clinic-800 hover:bg-clinic-900 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5" />
                      Track Appointment Panel Kholein
                    </button>
                  )}

                  {/* Recommended Doctor Cards Embedded Inside Chat */}
                  {msg.recommendedDoctors && msg.recommendedDoctors.length > 0 && (
                    <div className="space-y-2 mt-1.5 w-full">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Recommended Doctors in D.I. Khan:
                      </span>
                      {msg.recommendedDoctors.map((doc) => (
                        <div
                          key={doc.id}
                          className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs hover:border-clinic-400 transition-all space-y-2"
                        >
                          <div className="flex items-start gap-2.5">
                            {/* Avatar */}
                            <div className="w-12 h-12 rounded-xl bg-slate-900 overflow-hidden flex-shrink-0 relative border border-slate-200">
                              {doc.profile_image ? (
                                <img
                                  src={doc.profile_image}
                                  alt={doc.full_name}
                                  className="w-full h-full object-cover object-top"
                                />
                              ) : (
                                <div className="w-full h-full bg-clinic-900 text-white flex items-center justify-center font-bold text-sm">
                                  {doc.full_name.charAt(0)}
                                </div>
                              )}
                              {doc.is_spotlight && (
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-amber-400 rounded-full border border-white" title="Featured" />
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <h4 className="font-bold text-slate-900 text-xs truncate">{doc.full_name}</h4>
                                {doc.is_spotlight && (
                                  <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                    ★ Featured
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-clinic-700 font-medium truncate">{doc.specialty}</p>
                              
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                <span className="flex items-center gap-0.5 font-semibold text-slate-700">
                                  Rs. {doc.fee_clinic}
                                </span>
                                <span>&middot;</span>
                                <span className="text-emerald-700 font-medium">
                                  {doc.experience_years ? `${doc.experience_years} yrs exp` : 'Verified OPD'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Clinic Address */}
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg truncate">
                            <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{doc.clinic_address}</span>
                          </div>

                          {/* Action Button */}
                          <div className="flex gap-1.5 pt-0.5">
                            <button
                              onClick={() => {
                                setIsOpen(false);
                                onBook(doc);
                              }}
                              className="flex-1 bg-clinic-700 hover:bg-clinic-800 text-white font-semibold text-xs py-1.5 px-3 rounded-xl transition-colors shadow-2xs flex items-center justify-center gap-1"
                            >
                              <Calendar className="w-3 h-3" />
                              <span>Book Appointment</span>
                            </button>
                            {onProfile && (
                              <button
                                onClick={() => {
                                  setIsOpen(false);
                                  onProfile(doc);
                                }}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
                                title="Doctor Profile"
                              >
                                View
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-xl bg-slate-800 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2 items-center text-slate-400 text-xs pl-9">
                <Bot className="w-3.5 h-3.5 animate-spin text-clinic-600" />
                <span className="italic">AI Assistant doctor dhoond raha hai...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Emergency Safety Notice */}
          <div className="px-3 py-1.5 bg-amber-50/90 border-t border-amber-200/80 text-amber-900 text-[10px] flex items-center gap-1.5 flex-shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            <span className="truncate">
              Yeh AI mashwara hai. Shadeed emergency me foran <strong>DHQ Hospital Emergency</strong> tashreef le jayein.
            </span>
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 flex-shrink-0"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Apni bimari Roman Urdu me likhein (e.g. dil me dard)..."
              className="flex-1 px-3.5 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-clinic-600 focus:border-transparent transition-all"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isTyping}
              className="p-2 bg-clinic-700 hover:bg-clinic-800 disabled:opacity-50 text-white rounded-xl transition-all shadow-xs flex-shrink-0"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default HealthChatbot;
