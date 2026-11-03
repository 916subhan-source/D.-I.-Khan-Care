import React from 'react';
import { ChevronRight } from 'lucide-react';

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
    <div className="space-y-8 sm:space-y-12 my-6 sm:my-9">
      {/* ── Section 1: Consult Best Doctors by Specialty ── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-3 sm:p-8 border border-slate-100 dark:border-slate-800/90 shadow-xs transition-all w-full max-w-full overflow-hidden">
        <div className="flex items-center justify-between gap-3 mb-6 sm:mb-8">
          <div>
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Consult best doctors online
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Click any specialty to view qualified verified practitioners in D.I. Khan
            </p>
          </div>
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs sm:text-sm font-bold text-clinic-700 dark:text-emerald-400 hover:text-clinic-900 dark:hover:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer flex-shrink-0"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Clean Symmetrical 7-Column Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-y-6 gap-x-2 sm:gap-x-5 max-w-6xl mx-auto w-full">
          {HOME_SPECIALTIES.map(item => {
            const isSelected = selectedSpecialty.toLowerCase() === item.id.toLowerCase();
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSpecialty(item.id)}
                className={`group flex flex-col items-center text-center p-2 rounded-2xl transition-all cursor-pointer ${
                  isSelected
                    ? 'ring-2 ring-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 scale-105'
                    : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/60 hover:-translate-y-1'
                }`}
              >
                {/* Large Soft Floating Circular Container */}
                <div
                  className={`w-20 h-20 sm:w-24 sm:h-24 md:w-24 md:h-24 rounded-full flex items-center justify-center p-2.5 transition-all bg-[#eef4fc] dark:bg-slate-800/90 ${
                    isSelected
                      ? 'ring-3 ring-emerald-500 shadow-md scale-105'
                      : 'shadow-2xs group-hover:shadow-md group-hover:scale-105 group-hover:bg-[#e4effb] dark:group-hover:bg-slate-750'
                  }`}
                >
                  <img
                    src={item.image}
                    alt={item.label}
                    className="w-14 h-14 sm:w-16 sm:h-16 md:w-[68px] md:h-[68px] object-contain transition-transform duration-200 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>

                {/* Clear Label */}
                <span className={`mt-3 text-xs sm:text-[13px] font-bold leading-tight line-clamp-2 transition-colors w-full max-w-[135px] px-1 ${
                  isSelected
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-slate-800 dark:text-slate-200 group-hover:text-clinic-700 dark:group-hover:text-emerald-300'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Section 2: Search Doctor by Condition ── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-3 sm:p-8 border border-slate-100 dark:border-slate-800/90 shadow-xs transition-all w-full max-w-full overflow-hidden">
        <div className="flex items-center justify-between gap-3 mb-6 sm:mb-8">
          <div>
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Search doctor by condition
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Find specialists who treat your specific health symptoms and clinical diagnoses
            </p>
          </div>
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs sm:text-sm font-bold text-clinic-700 dark:text-emerald-400 hover:text-clinic-900 dark:hover:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer flex-shrink-0"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Clean Symmetrical 7-Column Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-y-6 gap-x-2 sm:gap-x-5 max-w-6xl mx-auto w-full">
          {HOME_CONDITIONS.map(item => {
            const isSelected = selectedCondition.toLowerCase() === item.id.toLowerCase();
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectCondition(item.id, item.label)}
                className={`group flex flex-col items-center text-center p-2 rounded-2xl transition-all cursor-pointer ${
                  isSelected
                    ? 'ring-2 ring-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 scale-105'
                    : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/60 hover:-translate-y-1'
                }`}
              >
                {/* Large Soft Floating Circular Container */}
                <div
                  className={`w-20 h-20 sm:w-24 sm:h-24 md:w-24 md:h-24 rounded-full flex items-center justify-center p-2.5 transition-all bg-[#eef4fc] dark:bg-slate-800/90 ${
                    isSelected
                      ? 'ring-3 ring-emerald-500 shadow-md scale-105'
                      : 'shadow-2xs group-hover:shadow-md group-hover:scale-105 group-hover:bg-[#e4effb] dark:group-hover:bg-slate-750'
                  }`}
                >
                  <img
                    src={item.image}
                    alt={item.label}
                    className="w-14 h-14 sm:w-16 sm:h-16 md:w-[68px] md:h-[68px] object-contain transition-transform duration-200 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>

                {/* Clear Label */}
                <span className={`mt-3 text-xs sm:text-[13px] font-bold leading-tight transition-colors w-full max-w-[135px] px-1 ${
                  isSelected
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-slate-800 dark:text-slate-200 group-hover:text-clinic-700 dark:group-hover:text-emerald-300'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
