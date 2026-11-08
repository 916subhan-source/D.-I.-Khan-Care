import React from 'react';
import { ChevronRight, Stethoscope, Sparkles } from 'lucide-react';

export interface SpecialtyItem {
  id: string;
  label: string;
  sublabel?: string;
  image: string;
}

export interface ConditionItem {
  id: string;
  label: string;
  keywords: string[];
  specialtyHint?: string;
  image: string;
}

interface HomeVisualFiltersProps {
  selectedSpecialty: string;
  selectedCondition: string;
  onSelectSpecialty: (specialty: string) => void;
  onSelectCondition: (conditionId: string, label: string) => void;
  onViewAll: () => void;
}

const SPECIALTY_STYLES: Record<string, { bg: string; border: string; glow: string; badge: string }> = {
  Cardiologist: {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-200/90 dark:border-rose-800/60',
    glow: 'group-hover:bg-rose-100 group-hover:border-rose-300',
    badge: 'Heart & BP'
  },
  'Orthopedic Surgeon': {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200/90 dark:border-amber-800/60',
    glow: 'group-hover:bg-amber-100 group-hover:border-amber-300',
    badge: 'Bones & Joints'
  },
  'Child Specialist': {
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    border: 'border-sky-200/90 dark:border-sky-800/60',
    glow: 'group-hover:bg-sky-100 group-hover:border-sky-300',
    badge: 'Kids Health'
  },
  'General Surgeon': {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200/90 dark:border-emerald-800/60',
    glow: 'group-hover:bg-emerald-100 group-hover:border-emerald-300',
    badge: 'Surgery'
  },
  'Laparoscopic Surgeon': {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    border: 'border-purple-200/90 dark:border-purple-800/60',
    glow: 'group-hover:bg-purple-100 group-hover:border-purple-300',
    badge: 'Laser & Keyhole'
  },
  'Face and Skin Surgeon': {
    bg: 'bg-pink-50 dark:bg-pink-950/40',
    border: 'border-pink-200/90 dark:border-pink-800/60',
    glow: 'group-hover:bg-pink-100 group-hover:border-pink-300',
    badge: 'Cosmetic & Skin'
  }
};

const CONDITION_STYLES: Record<string, { bg: string; border: string; glow: string; badge: string }> = {
  fever: {
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    border: 'border-orange-200/90 dark:border-orange-800/60',
    glow: 'group-hover:bg-orange-100 group-hover:border-orange-300',
    badge: 'Viral & Infection'
  },
  heart_attack: {
    bg: 'bg-red-50 dark:bg-red-950/40',
    border: 'border-red-200/90 dark:border-red-800/60',
    glow: 'group-hover:bg-red-100 group-hover:border-red-300',
    badge: 'Chest & Pulse'
  },
  pregnancy: {
    bg: 'bg-pink-50 dark:bg-pink-950/40',
    border: 'border-pink-200/90 dark:border-pink-800/60',
    glow: 'group-hover:bg-pink-100 group-hover:border-pink-300',
    badge: 'Maternal Care'
  },
  high_blood: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-200/90 dark:border-blue-800/60',
    glow: 'group-hover:bg-blue-100 group-hover:border-blue-300',
    badge: 'Hypertension'
  },
  piles: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200/90 dark:border-amber-800/60',
    glow: 'group-hover:bg-amber-100 group-hover:border-amber-300',
    badge: 'Digestive & Rectal'
  },
  diarrhea: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200/90 dark:border-emerald-800/60',
    glow: 'group-hover:bg-emerald-100 group-hover:border-emerald-300',
    badge: 'Stomach & Gut'
  },
  acne: {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    border: 'border-purple-200/90 dark:border-purple-800/60',
    glow: 'group-hover:bg-purple-100 group-hover:border-purple-300',
    badge: 'Skin & Pimples'
  }
};

export const HOME_SPECIALTIES: SpecialtyItem[] = [
  {
    id: 'Cardiologist',
    label: 'Cardiologist',
    sublabel: 'Heart & Vascular',
    image: '/filters/spec_cardiologist.png'
  },
  {
    id: 'Orthopedic Surgeon',
    label: 'Orthopedic Surgeon',
    sublabel: 'Bones & Joints',
    image: '/filters/spec_orthopedic_surgeon.png'
  },
  {
    id: 'Child Specialist',
    label: 'Child Specialist',
    sublabel: 'Pediatrics & Kids',
    image: '/filters/spec_child_specialist.png'
  },
  {
    id: 'General Surgeon',
    label: 'General Surgeon',
    sublabel: 'General Surgery',
    image: '/filters/spec_general_surgeon.png'
  },
  {
    id: 'Laparoscopic Surgeon',
    label: 'Laparoscopic Surgeon',
    sublabel: 'Laser & Keyhole',
    image: '/filters/spec_laparoscopic_surgeon.png'
  },
  {
    id: 'Face and Skin Surgeon',
    label: 'Face and Skin Surgeon',
    sublabel: 'Aesthetics & Plastic',
    image: '/filters/spec_face_skin_surgeon.png'
  }
];

export const HOME_CONDITIONS: ConditionItem[] = [
  {
    id: 'fever',
    label: 'Fever',
    keywords: ['fever', 'infection', 'viral', 'flu', 'general', 'internal', 'malaria', 'typhoid'],
    specialtyHint: 'General Physician',
    image: '/filters/cond_fever.png'
  },
  {
    id: 'heart_attack',
    label: 'Heart Attack',
    keywords: ['heart', 'cardio', 'chest pain', 'cardiology', 'angina', 'coronary', 'attack'],
    specialtyHint: 'Cardiologist',
    image: '/filters/cond_heart_attack.png'
  },
  {
    id: 'pregnancy',
    label: 'Pregnancy',
    keywords: ['pregnancy', 'gynae', 'maternity', 'obstetrics', 'women', 'fertility', 'antenatal', 'birth'],
    specialtyHint: 'Gynaecologist',
    image: '/filters/cond_pregnancy.png'
  },
  {
    id: 'high_blood',
    label: 'High Blood',
    keywords: ['blood pressure', 'hypertension', 'bp', 'cardio', 'heart', 'vascular'],
    specialtyHint: 'Cardiologist',
    image: '/filters/cond_high_blood_pressure.png'
  },
  {
    id: 'piles',
    label: 'Piles',
    keywords: ['piles', 'hemorrhoids', 'fissure', 'fistula', 'surgeon', 'surgery', 'laparoscopic', 'rectal'],
    specialtyHint: 'General Surgeon',
    image: '/filters/cond_piles.png'
  },
  {
    id: 'diarrhea',
    label: 'Diarrhea',
    keywords: ['diarrhea', 'stomach', 'gastro', 'gut', 'acidity', 'abdominal', 'digestion', 'vomiting'],
    specialtyHint: 'Gastroenterologist',
    image: '/filters/cond_diarrhea.png'
  },
  {
    id: 'acne',
    label: 'Acne',
    keywords: ['acne', 'skin', 'derma', 'rash', 'pimples', 'eczema', 'allergy', 'hair'],
    specialtyHint: 'Dermatologist',
    image: '/filters/cond_acne.png'
  }
];

export default function HomeVisualFilters({
  selectedSpecialty,
  selectedCondition,
  onSelectSpecialty,
  onSelectCondition,
  onViewAll
}: HomeVisualFiltersProps) {
  return (
    <div className="space-y-8 sm:space-y-10 my-6 sm:my-9">
      {/* ── Section 1: Consult Best Doctors by Specialty ── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all w-full max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/70 dark:border-emerald-800/50 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mb-2">
              <Stethoscope className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>Specialist Directory</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Top Medical Specialties
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium">
              Consult verified specialist doctors with active clinic timings in D.I. Khan
            </p>
          </div>
          <button
            type="button"
            onClick={onViewAll}
            className="self-start sm:self-auto text-xs sm:text-sm font-bold text-clinic-700 dark:text-emerald-400 hover:text-clinic-900 dark:hover:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer flex-shrink-0 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
          >
            <span>View All Specialties</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Clean Symmetrical 6-Column Grid with Elevated Pods */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 max-w-6xl mx-auto w-full">
          {HOME_SPECIALTIES.map(item => {
            const isSelected = selectedSpecialty.toLowerCase() === item.id.toLowerCase();
            const style = SPECIALTY_STYLES[item.id] || {
              bg: 'bg-slate-50 dark:bg-slate-800',
              border: 'border-slate-200 dark:border-slate-700',
              glow: 'group-hover:bg-slate-100',
              badge: 'Specialist'
            };

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSpecialty(item.id)}
                className={`group relative flex flex-col items-center text-center p-3 sm:p-4 rounded-2xl sm:rounded-3xl transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-500 shadow-md scale-[1.03]'
                    : 'bg-white/80 dark:bg-slate-800/70 border-slate-100 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md hover:-translate-y-1'
                }`}
              >
                {/* Themed Pastel Circle with Drop Shadow */}
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center p-2.5 transition-all border ${style.bg} ${style.border} ${style.glow} shadow-2xs group-hover:scale-105`}
                >
                  <img
                    src={item.image}
                    alt={item.label}
                    className="w-11 h-11 sm:w-13 sm:h-13 object-contain transition-transform duration-200 group-hover:scale-110 drop-shadow-xs"
                    loading="lazy"
                  />
                </div>

                {/* Bold Specialty Name */}
                <span className={`mt-2.5 text-xs sm:text-[13px] font-bold leading-snug transition-colors w-full text-center break-words px-0.5 ${
                  isSelected
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
                }`}>
                  {item.label}
                </span>

                {/* Micro Subtitle Badge */}
                <span className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-full">
                  {style.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Section 2: Search Doctor by Condition ── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all w-full max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-200/70 dark:border-amber-800/50 text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-2">
              <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>Symptom Checker</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Find Doctors by Health Symptoms
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium">
              Select your symptoms to find experienced specialists in D.I. Khan
            </p>
          </div>
          <button
            type="button"
            onClick={onViewAll}
            className="self-start sm:self-auto text-xs sm:text-sm font-bold text-clinic-700 dark:text-emerald-400 hover:text-clinic-900 dark:hover:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer flex-shrink-0 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
          >
            <span>View All Symptoms</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Clean Symmetrical Grid for Conditions */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 max-w-6xl mx-auto w-full">
          {HOME_CONDITIONS.slice(0, 6).map(item => {
            const isSelected = selectedCondition.toLowerCase() === item.id.toLowerCase();
            const style = CONDITION_STYLES[item.id] || {
              bg: 'bg-slate-50 dark:bg-slate-800',
              border: 'border-slate-200 dark:border-slate-700',
              glow: 'group-hover:bg-slate-100',
              badge: 'Symptom'
            };

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectCondition(item.id, item.label)}
                className={`group relative flex flex-col items-center text-center p-3 sm:p-4 rounded-2xl sm:rounded-3xl transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-500 shadow-md scale-[1.03]'
                    : 'bg-white/80 dark:bg-slate-800/70 border-slate-100 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md hover:-translate-y-1'
                }`}
              >
                {/* Themed Pastel Circle */}
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center p-2.5 transition-all border ${style.bg} ${style.border} ${style.glow} shadow-2xs group-hover:scale-105`}
                >
                  <img
                    src={item.image}
                    alt={item.label}
                    className="w-11 h-11 sm:w-13 sm:h-13 object-contain transition-transform duration-200 group-hover:scale-110 drop-shadow-xs"
                    loading="lazy"
                  />
                </div>

                {/* Bold Condition Name */}
                <span className={`mt-2.5 text-xs sm:text-[13px] font-bold leading-snug transition-colors w-full text-center break-words px-0.5 ${
                  isSelected
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
                }`}>
                  {item.label}
                </span>

                {/* Micro Subtitle Badge */}
                <span className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-full">
                  {style.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
