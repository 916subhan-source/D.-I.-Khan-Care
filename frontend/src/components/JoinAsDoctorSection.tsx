import React, { useState } from 'react';
import {
  PhoneCall,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Stethoscope,
  Users,
  Clock,
  Sparkles,
  ArrowRight,
  Building2,
  Send,
  HelpCircle,
  FileCheck2,
  Zap,
  CalendarCheck
} from 'lucide-react';

interface JoinAsDoctorSectionProps {
  onBackToDirectory?: () => void;
  onFindDoctor?: () => void;
}

export const JoinAsDoctorSection: React.FC<JoinAsDoctorSectionProps> = ({
  onBackToDirectory,
  onFindDoctor
}) => {
  const adminPhone = '03325255879';
  const adminPhoneIntl = '+923325255879';
  const whatsappUrl = `https://wa.me/923325255879?text=${encodeURIComponent(
    'Assalam-o-Alaikum Admin, I am a doctor/clinic owner in Dera Ismail Khan and I want to join the D.I. Khan Care healthcare network.'
  )}`;

  const [doctorName, setDoctorName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [locality, setLocality] = useState('');
  const [whatsappContact, setWhatsappContact] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);

  const handleSubmitInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    const message = `*Doctor Onboarding Inquiry - D.I. Khan Care*\n\n` +
      `*Doctor Name:* Dr. ${doctorName.trim()}\n` +
      `*Specialty:* ${specialty.trim()}\n` +
      `*Clinic / Hospital:* ${clinicName.trim()}\n` +
      `*Locality / Road:* ${locality.trim() || 'Dera Ismail Khan'}\n` +
      `*WhatsApp Contact:* ${whatsappContact.trim()}\n\n` +
      `Please guide me through the doctor registration and clinic portal onboarding process.`;

    const customWaUrl = `https://wa.me/923325255879?text=${encodeURIComponent(message)}`;
    window.open(customWaUrl, '_blank');
    setFormSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-[#080d14] text-slate-900 dark:text-slate-100 py-6 sm:py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-8 sm:space-y-12">

        {/* ── Top Hero Card ── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-950 text-white p-6 sm:p-10 shadow-2xl border border-emerald-500/20">
          {/* Subtle Ambient Refractions */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-4xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs sm:text-sm font-bold tracking-wider uppercase backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>For Doctors &amp; Specialists · ڈی آئی خان کے ڈاکٹرز کے لیے</span>
            </div>

            <h1
              className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Join as a Verified Doctor{' '}
              <span className="inline-block whitespace-nowrap bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
                on D.I. Khan Care
              </span>
            </h1>

            {/* Urdu Title & Subheading */}
            <div dir="rtl" className="pt-1">
              <h2 className="font-urdu-hero text-lg sm:text-2xl lg:text-[1.75rem] font-bold text-emerald-100 leading-[1.8] max-w-full">
                اگر آپ بطور ڈاکٹر شامل ہونا چاہتے ہیں تو انتظامیہ سے رابطہ کریں
              </h2>
            </div>

            <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed max-w-2xl font-medium pt-1">
              Automate your clinic appointment flow, stop crowded patient lines, and give your patients guaranteed digital queue tokens with automatic reminders. 100% free onboarding for medical specialists across Dera Ismail Khan.
            </p>
          </div>
        </div>

        {/* ── Primary Admin Contact Highlight Box ── */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-500/40 dark:border-emerald-500/30 p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full pointer-events-none" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Direct Administration Desk
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                If you want to join as a doctor, contact the admins
              </h3>
              <p dir="rtl" className="font-urdu-hero text-base sm:text-lg font-bold text-emerald-700 dark:text-emerald-400">
                ڈاکٹر رجسٹریشن اور کلینک پینل حاصل کرنے کے لیے رابطہ نمبر:
              </p>
              <div className="pt-2 flex items-center justify-center md:justify-start gap-3">
                <span className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-wider text-emerald-700 dark:text-emerald-400 font-mono select-all">
                  {adminPhone}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                  Official Admin Line
                </span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-3 w-full md:w-auto shrink-0">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full md:w-64 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-extrabold text-sm sm:text-base shadow-lg hover:shadow-emerald-500/25 flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer text-center"
              >
                <MessageSquare className="w-5 h-5" />
                <span>Chat on WhatsApp</span>
              </a>

              <a
                href={`tel:${adminPhoneIntl}`}
                className="w-full md:w-64 px-6 py-3.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-extrabold text-sm sm:text-base shadow-md flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer text-center"
              >
                <PhoneCall className="w-5 h-5 text-emerald-400 dark:text-emerald-600" />
                <span>Call Admin Now</span>
              </a>
            </div>
          </div>
        </div>

        {/* ── Key Benefits Grid for Doctors ── */}
        <div className="space-y-4">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Why Join D.I. Khan's Leading Healthcare Network?
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Built exclusively for clinics, consultants, and specialist surgeons in Dera Ismail Khan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 pt-2">
            {[
              {
                icon: Users,
                title: 'No Crowded Waiting Lines',
                urdu: 'کلینک کے انتظار گاہ میں رش کا خاتمہ',
                desc: 'Patients receive exact slot token numbers with live queue tracking, arriving right on time without overcrowding your reception.'
              },
              {
                icon: Stethoscope,
                title: 'Free Assistant / Reception POS',
                urdu: 'مفت اسسٹنٹ اور کاؤنٹر سافٹ ویئر',
                desc: 'Your clinic receptionist gets a dedicated desktop dashboard to call tokens, record vitals, mark fees, and print patient slips.'
              },
              {
                icon: ShieldCheck,
                title: '100% Cash at Clinic Arrival',
                urdu: 'فیس براہ راست کلینک کاؤنٹر پر وصول کریں',
                desc: 'Patients pay cash directly to your counter. No platform commission deductions or payment delays.'
              },
              {
                icon: CalendarCheck,
                title: 'Full Schedule Flexibility',
                urdu: 'اپنے اوقات کار اور شفٹوں پر مکمل کنٹرول',
                desc: 'Easily set morning or evening shifts, slot durations, custom consultation fees, and emergency clinic leaves anytime.'
              },
              {
                icon: Zap,
                title: 'Automated Reminders',
                urdu: 'مریضوں کو آٹومیٹک یاددہانی میسجز',
                desc: 'Patients receive automatic confirmation passes and 1-hour appointment reminder alerts via SMS and WhatsApp.'
              },
              {
                icon: Building2,
                title: 'Verified Specialist Profile',
                urdu: 'ڈی آئی خان بھر کے مریضوں تک رسائی',
                desc: 'Reach thousands of verified patients searching for top doctors across Circular Road, Topanwala, Tank, Kulachi, and DHQ vicinities.'
              }
            ].map((benefit, idx) => {
              const IconComp = benefit.icon;
              return (
                <div
                  key={idx}
                  className="rounded-2xl p-5 bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-md hover:shadow-xl hover:border-emerald-300 dark:hover:border-emerald-700/60 transition-all space-y-2.5 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
                      <IconComp className="w-5 h-5" />
                    </div>
                    <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {benefit.title}
                    </h4>
                    <div dir="rtl" className="font-urdu-hero text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      {benefit.urdu}
                    </div>
                    <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      {benefit.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 4-Step Simple Onboarding Process ── */}
        <div className="rounded-3xl bg-slate-900 text-white p-6 sm:p-10 shadow-xl space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest">
              Simple 15-Minute Process
            </span>
            <h3 className="text-xl sm:text-3xl font-black text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
              How to Get Started as a Doctor
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                step: '01',
                title: 'Contact Administration',
                desc: `Call or message our admin team at ${adminPhone} to request your onboarding.`
              },
              {
                step: '02',
                title: 'Verify Credentials',
                desc: 'Share your PMDC license, medical specialty, consultation fees, and clinic address.'
              },
              {
                step: '03',
                title: 'Panel Configuration',
                desc: 'Our team configures your Doctor Portal and Receptionist Assistant desk account in 15 minutes.'
              },
              {
                step: '04',
                title: 'Start Receiving Patients',
                desc: 'Your profile goes live on D.I. Khan Care and patients start booking guaranteed digital tokens!'
              }
            ].map((st, i) => (
              <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-2 relative">
                <span className="text-3xl font-black text-emerald-400/40 font-mono">
                  {st.step}
                </span>
                <h5 className="text-base font-bold text-white">
                  {st.title}
                </h5>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {st.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Interactive Doctor Join Inquiry Form ── */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-xl space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Fast Doctor Registration</span>
            </div>
            <h3 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Submit Doctor Registration Request
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Fill in your basic clinic information and our admin team will contact you directly within 2 hours.
            </p>
          </div>

          <form onSubmit={handleSubmitInquiry} className="max-w-2xl mx-auto space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Doctor's Full Name *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Dr.</span>
                  <input
                    type="text"
                    required
                    value={doctorName}
                    onChange={e => setDoctorName(e.target.value)}
                    placeholder="e.g. Muhammad Aslam"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Medical Specialty *
                </label>
                <input
                  type="text"
                  required
                  value={specialty}
                  onChange={e => setSpecialty(e.target.value)}
                  placeholder="e.g. Cardiologist, Child Specialist"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Clinic / Hospital Name *
                </label>
                <input
                  type="text"
                  required
                  value={clinicName}
                  onChange={e => setClinicName(e.target.value)}
                  placeholder="e.g. Aslam Heart & Medical Center"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Road / Locality in D.I. Khan *
                </label>
                <input
                  type="text"
                  required
                  value={locality}
                  onChange={e => setLocality(e.target.value)}
                  placeholder="e.g. Circular Road, Topanwala"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Your WhatsApp Contact Number *
              </label>
              <input
                type="tel"
                required
                value={whatsappContact}
                onChange={e => setWhatsappContact(e.target.value)}
                placeholder="03XXXXXXXXX"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-sm sm:text-base shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Submit via WhatsApp to Admin (03325255879)</span>
            </button>

            {formSubmitted && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-800 dark:text-emerald-300 text-xs font-semibold text-center">
                ✓ WhatsApp opened! Our administration will review your details and set up your doctor portal right away.
              </div>
            )}
          </form>
        </div>

        {/* ── Footer Navigation Back ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={onBackToDirectory}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            ← Back to Home
          </button>

          <button
            type="button"
            onClick={onFindDoctor}
            className="px-4 py-2 rounded-xl bg-clinic-600 hover:bg-clinic-700 text-white transition cursor-pointer"
          >
            Browse Verified Specialists Directory →
          </button>
        </div>

      </div>
    </div>
  );
};

export default JoinAsDoctorSection;
