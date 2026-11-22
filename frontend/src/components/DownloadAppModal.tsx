import React, { useState } from 'react';
import { Smartphone, Download, CheckCircle, ShieldCheck, ArrowDownToLine, X, Sparkles, AlertCircle } from 'lucide-react';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt?: any;
}

export const DownloadAppModal: React.FC<DownloadAppModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
}) => {
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [installPromptTriggered, setInstallPromptTriggered] = useState(false);

  if (!isOpen) return null;

  const handleDownloadApk = () => {
    setDownloadStarted(true);
    // Trigger download
    const link = document.createElement('a');
    link.href = '/downloads/dikhan-care.apk';
    link.download = 'DIK-Care-v1.0.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Fallback if local file not yet generated: redirect to releases
    setTimeout(() => {
      setDownloadStarted(false);
    }, 4000);
  };

  const handlePwaInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstallPromptTriggered(true);
      }
    } else {
      // If prompt not available (e.g. already installed or iOS), explain
      alert(
        'To install directly on your phone:\n\n1. In Chrome: Tap the top right menu (⋮) -> Tap "Install app" or "Add to Home screen".\n2. In Safari (iPhone): Tap the Share button -> Tap "Add to Home Screen".'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-6 py-6 text-white relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-3.5">
              <img 
                src="/logo.png" 
                alt="D.I. Khan Care Logo" 
                className="w-13 h-13 rounded-2xl object-cover ring-2 ring-white/30 shadow-md bg-white p-1" 
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-extrabold tracking-tight">D.I. Khan Care</h3>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-xs">
                    Android APK
                  </span>
                </div>
                <p className="text-xs text-emerald-100 mt-0.5 font-medium">
                  Official Mobile App • Free & Instant
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Key Advantages */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">Instant Queue Token</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Live phone tracking</div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">Verified Doctors</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">PMDC certified only</div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 flex items-start gap-2.5">
              <Smartphone className="w-4 h-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">One-Tap Booking</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Save family details</div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">Zero Advance Fee</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Pay cash at clinic</div>
              </div>
            </div>
          </div>

          {/* Primary Action: Direct APK Download */}
          <div className="space-y-3">
            <button
              onClick={handleDownloadApk}
              className="w-full py-4 px-6 rounded-2xl font-extrabold text-white text-base shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}
            >
              <ArrowDownToLine className="w-5 h-5 animate-bounce" />
              <span>{downloadStarted ? 'Downloading DIK-Care.apk...' : 'Download Android App (.APK)'}</span>
            </button>

            {/* Instant PWA Install option */}
            <button
              onClick={handlePwaInstall}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{installPromptTriggered ? 'Installed to Home Screen!' : 'Or Add to Home Screen (Instant 0 MB Install)'}</span>
            </button>
          </div>

          {/* 3-Step Installation Guide */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-300">
              <AlertCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span>Android Installation Guide (Easy 3 Steps):</span>
            </div>

            <ol className="text-xs text-slate-700 dark:text-slate-300 space-y-2 list-decimal list-inside pl-1 leading-relaxed">
              <li>
                <span className="font-semibold text-slate-900 dark:text-white">Download APK:</span> Tap the green button above to download <code className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-[11px] font-mono">DIK-Care-v1.0.apk</code>.
              </li>
              <li>
                <span className="font-semibold text-slate-900 dark:text-white">Open File:</span> Swipe down your notification bar or open your phone's <em>Downloads</em> folder and tap the file.
              </li>
              <li>
                <span className="font-semibold text-slate-900 dark:text-white">Install:</span> Tap <strong>"Install"</strong> (if prompted, turn on <em>"Allow from this source"</em>).
              </li>
            </ol>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Safe & Virus-Free</span>
          </div>
          <span>Package: io.dikhancare.app</span>
        </div>
      </div>
    </div>
  );
};
