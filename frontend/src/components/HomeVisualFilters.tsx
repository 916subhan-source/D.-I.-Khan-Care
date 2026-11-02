import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface SpecialtyItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
}

export interface ConditionItem {
  id: string;
  label: string;
  keywords: string[];
  specialtyHint?: string;
  icon: React.ReactNode;
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
    id: 'Dermatologist',
    label: 'Dermatologist',
    sublabel: 'Skin & Hair',
    icon: (
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-12 sm:h-12" fill="none">
        {/* Palm / Hand */}
        <path d="M20 44c0-5 3-9 8-10l7-2c2 0 4 2 4 4v4l-3 3-5 5c-3 3-6 5-11-4z" fill="#fed7aa" />
        <path d="M27 32l8-8c1.5-1.5 4-1.5 5.5 0l1 1c1.5 1.5 1.5 4 0 5.5l-6 6" stroke="#fb923c" strokeWidth="2.5" strokeLinecap="round" />
        {/* Blue Magnifying Glass */}
        <circle cx="39" cy="23" r="11" fill="#e0f2fe" stroke="#0284c7" strokeWidth="3.5" />
        <circle cx="39" cy="23" r="7" fill="#bae6fd" />
        {/* Glass Reflection */}
        <path d="M35 18a6 6 0 015-1" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
        {/* Handle */}
        <path d="M47 31l9 9" stroke="#0369a1" strokeWidth="5" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'Gynaecologist',
    label: 'Gynecologist',
    sublabel: 'Women Health',
    icon: (
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-12 sm:h-12" fill="none">
        {/* Female Head & Sleek Hair */}
        <circle cx="32" cy="17" r="5.5" fill="#fed7aa" />
        <path d="M27 13c2-4 10-3 11 2 1 4 0 8-3 9-1-3-2-6-5-6s-4 2-5 3c1-3 1-5 2-8z" fill="#0f172a" />
        {/* Navy Blue Dress with Pregnant Curve */}
        <path d="M26 24c3-1 7-1 9 0 3 2 4 6 4 9 0 6-5 10-10 10-2 0-3-1-4-2 0 4-1 9-2 13h-5c1-6 2-13 2-19 0-4 2-8 6-11z" fill="#1e3a8a" />
        <path d="M34 29c3 2 4 5 4 8 0 4-3 7-7 8" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'Urologist',
    label: 'Urologist',
    sublabel: 'Kidney & Bladder',
    icon: (
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-12 sm:h-12" fill="none">
        {/* Dual Kidneys in Reddish Pink */}
        <path d="M19 19c-3 0-5 3-5 6 0 5 4 8 7 7 2-1 3-3 2-6 0-4-2-7-4-7z" fill="#f87171" />
        <path d="M45 19c3 0 5 3 5 6 0 5-4 8-7 7-2-1-3-3-2-6 0-4 2-7 4-7z" fill="#f87171" />
        {/* Ureters in Cyan Blue */}
        <path d="M20 28c2 5 6 9 10 11m14-11c-2 5-6 9-10 11" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" fill="none" />
        {/* Bladder in Peach Orange */}
        <path d="M24 37c-4 2-6 6-5 10 1 5 7 8 13 8s12-3 13-8c1-4-1-8-5-10-4 1-12 1-16 0z" fill="#fb923c" />
        <path d="M27 45c2 2 6 3 9 3s7-1 9-3" stroke="#ea580c" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'Gastroenterologist',
    label: 'Gastroenterologist',
    sublabel: 'Stomach & Liver',
    icon: (
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-12 sm:h-12" fill="none">
        {/* Esophagus Tube */}
        <path d="M31 12v8" stroke="#fb923c" strokeWidth="4.5" strokeLinecap="round" />
        {/* Stomach Curvature in Peach & Orange */}
        <path d="M32 19c6 0 14 3 16 10 2 8-1 16-8 20-8 3-18 1-21-6-3-6 0-14 5-18 3-2 5-5 8-6z" fill="#fb923c" />
        <path d="M31 21c-4 3-7 8-5 13 2 5 8 7 13 5 5-2 7-7 5-12-2-4-7-6-13-6z" fill="#fed7aa" />
        {/* Duodenum */}
        <path d="M23 44c-3 2-5 5-5 8h6" stroke="#ea580c" strokeWidth="4" strokeLinecap="round" fill="none" />
      </svg>
    )
  },
  {
    id: 'Dentist',
    label: 'Dentist',
    sublabel: 'Teeth & Gums',
    icon: (
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-12 sm:h-12" fill="none">
        {/* Slanted Toothbrush Handle */}
        <path d="M17 47l22-22" stroke="#0284c7" strokeWidth="6.5" strokeLinecap="round" />
        <path d="M16 48l4-4" stroke="#0369a1" strokeWidth="6.5" strokeLinecap="round" />
        {/* Brush Head */}
        <path d="M39 25l8-8" stroke="#38bdf8" strokeWidth="7.5" strokeLinecap="round" />
        {/* White Bristles & Foam */}
        <path d="M36 20l8-8" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M38 17c2-2 6-1 7 1" stroke="#38bdf8" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'General Surgeon',
    label: 'Obesity Specialist',
    sublabel: 'Bariatric Care',
    icon: (
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-12 sm:h-12" fill="none">
        {/* Head */}
        <circle cx="32" cy="14" r="5" fill="#fed7aa" />
        <path d="M29 10c1-2 5-2 6 0" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
        {/* Full Bariatric Torso in Blue Shirt */}
        <path d="M20 22c-4 0-6 3-6 6 0 3 2 5 4 5l2 9c2 4 6 6 12 6s10-2 12-6l2-9c2 0 4-2 4-5 0-3-2-6-6-6-3 0-8 1-12 1s-9-1-12-1z" fill="#2563eb" />
        {/* Brown Pants */}
        <path d="M25 48l-2 8h6l3-5 3 5h6l-2-8c-3 1-8 1-10 0z" fill="#b45309" />
      </svg>
    )
  },
  {
    id: 'ENT Specialist',
    label: 'ENT Specialist',
    sublabel: 'Ear, Nose & Throat',
    icon: (
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-12 sm:h-12" fill="none">
        {/* Profile Head */}
        <path d="M38 15c-6 0-11 4-11 11 0 2 0 4 1 6l-5 5c-1 1-1 3 1 3h5v4c0 4 3 7 7 7h3c3 0 5-2 5-5v-6c2-1 4-3 4-6 0-5-4-9-10-9z" fill="#fed7aa" />
        <path d="M22 35h5m-2 4h4" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />
        {/* Orange Ear */}
        <path d="M39 24c2 0 4 2 4 5s-2 5-4 5c-1 0-2-1-2-2" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" fill="none" />
        {/* Throat Highlight Circle */}
        <circle cx="34" cy="45" r="3.5" fill="#f43f5e" />
      </svg>
    )
  },
  {
    id: 'Orthopedic Surgeon',
    label: 'Orthopedic Surgeon',
    sublabel: 'Bones & Joints',
    icon: (
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-12 sm:h-12" fill="none">
        {/* Femur Upper Bone */}
        <path d="M21 14c0 3 3 5 6 6l8 8" stroke="#cbd5e1" strokeWidth="7.5" strokeLinecap="round" />
        {/* Lower Bone */}
        <path d="M35 28v22" stroke="#cbd5e1" strokeWidth="7.5" strokeLinecap="round" />
        {/* Knee Joint Accent */}
        <circle cx="35" cy="28" r="7.5" fill="#0284c7" />
        <path d="M25 21l17 17" stroke="#38bdf8" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="35" cy="28" r="3.5" fill="#ffffff" />
      </svg>
    )
  },
  {
    id: 'Sexologist',
    label: 'Sexologist',
    sublabel: 'Sexual Health',
    icon: (
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-12 sm:h-12" fill="none">
        {/* Profile Head Outline in Peach */}
        <path d="M39 14c-7 0-12 5-12 11 0 2 0 4 1 5l-5 5c-1 1-1 3 1 3h5v4c0 4 3 7 7 7h4c3 0 5-2 5-5v-5c2-1 4-3 4-6 0-6-4-10-10-10z" fill="#fed7aa" />
        <path d="M39 44v5m-8-5v5" stroke="#fed7aa" strokeWidth="6" strokeLinecap="round" />
        {/* Pink Anatomical Brain inside head */}
        <path d="M38 18c-4 0-7 2-8 5-2 1-3 3-3 6 0 3 1 5 3 6 0 3 2 5 5 5 2 0 3-1 3-1 1 1 2 1 3 1 3 0 5-3 5-6 2-1 3-3 3-6 0-3-1-5-3-6-1-3-4-4-8-4z" fill="#f472b6" />
        <path d="M38 20v13m-4-10c2 1 3 1 4 2m-6 3c2 0 3 2 5 2m8-5c-2 1-3 1-4 2m6 3c-2 0-3 2-5 2" stroke="#be185d" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'Neurologist',
    label: 'Neurologist',
    sublabel: 'Brain & Nerves',
    icon: (
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-12 sm:h-12" fill="none">
        {/* Full Pink Brain Illustration */}
        <path d="M32 15c-5 0-9 3-10 7-3 1-5 4-5 8 0 4 2 7 5 8 0 4 3 8 7 8 2 0 3-1 4-2 1 1 3 2 4 2 4 0 7-4 7-8 3-1 5-4 5-8 0-4-2-7-5-8-1-4-5-7-10-7z" fill="#f472b6" />
        {/* Cerebral sulci convolutions */}
        <path d="M32 17v27m-7-20c3 2 5 1 6 3m-9 5c3 0 4 3 7 3m-6 5c2 0 3 2 5 2m12-15c-3 2-5 1-6 3m9 5c-3 0-4 3-7 3m6 5c-2 0-3 2-5 2" stroke="#be185d" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'Pediatrician',
    label: 'Child Specialist',
    sublabel: 'Baby & Kids',
    icon: (
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-12 sm:h-12" fill="none">
        {/* Baby Face */}
        <circle cx="32" cy="27" r="14" fill="#fed7aa" />
        {/* Blue Hair Swirl */}
        <path d="M32 13c0-3-2-4-2-4s3 0 4 3" stroke="#0284c7" strokeWidth="3.5" strokeLinecap="round" />
        {/* Eyes & Pink Cheeks */}
        <circle cx="27" cy="26" r="2.2" fill="#1e293b" />
        <circle cx="37" cy="26" r="2.2" fill="#1e293b" />
        <circle cx="24" cy="30" r="2.5" fill="#f472b6" />
        <circle cx="40" cy="30" r="2.5" fill="#f472b6" />
        <path d="M29 32c1.5 2 4.5 2 6 0" stroke="#ea580c" strokeWidth="2.2" strokeLinecap="round" />
        {/* Navy Onesie Collar */}
        <path d="M21 41c3-2 7-3 11-3s8 1 11 3l3 9H18l3-9z" fill="#1e3a8a" />
        <path d="M27 38c2 3 8 3 10 0" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'Laparoscopic Surgeon',
    label: 'Pulmonologist',
    sublabel: 'Lungs & Breathing',
    icon: (
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-12 sm:h-12" fill="none">
        {/* Blue Trachea / Airway */}
        <path d="M32 14v12m-3-7h6m-5 3h5" stroke="#0284c7" strokeWidth="3.5" strokeLinecap="round" />
        {/* Navy Blue Lungs */}
        <path d="M30 26c-5-3-12-1-14 6-2 7 1 15 6 17 5 2 9-1 10-6v-17z" fill="#1e3a8a" />
        <path d="M34 26c5-3 12-1 14 6 2 7-1 15-6 17-5 2-9-1-10-6v-17z" fill="#1e3a8a" />
        {/* Light Blue Bronchial Tree */}
        <path d="M28 32l-6 4m6 3l-4 3m10-7l6 4m-6 3l4 3" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'Ophthalmologist',
    label: 'Eye Specialist',
    sublabel: 'Vision & Glasses',
    icon: (
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-12 sm:h-12" fill="none">
        {/* Navy Round Spectacles */}
        <circle cx="22" cy="32" r="10" stroke="#1e3a8a" strokeWidth="4" fill="#f0f9ff" />
        <circle cx="42" cy="32" r="10" stroke="#1e3a8a" strokeWidth="4" fill="#f0f9ff" />
        <path d="M32 30c2-2 4-2 6 0" stroke="#1e3a8a" strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d="M12 30l-4-2m44 2l4-2" stroke="#1e3a8a" strokeWidth="4" strokeLinecap="round" />
        {/* Pupils & Reflections */}
        <circle cx="22" cy="32" r="3.5" fill="#0284c7" />
        <circle cx="42" cy="32" r="3.5" fill="#0284c7" />
        <circle cx="23" cy="31" r="1" fill="#ffffff" />
        <circle cx="43" cy="31" r="1" fill="#ffffff" />
      </svg>
    )
  },
  {
    id: 'General Physician',
    label: 'General Physician',
    sublabel: 'Family Medicine',
    icon: (
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-12 sm:h-12" fill="none">
        {/* Navy Stethoscope Tubes */}
        <path d="M22 16v9c0 6 4 10 10 10s10-4 10-10v-9" stroke="#1e3a8a" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        <path d="M32 35v8a5 5 0 005 5h1a5 5 0 005-5v-2" stroke="#1e3a8a" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        {/* Bell / Diaphragm */}
        <circle cx="43" cy="41" r="5" fill="#0284c7" stroke="#1e3a8a" strokeWidth="3" />
        <circle cx="22" cy="16" r="3" fill="#0284c7" />
        <circle cx="42" cy="16" r="3" fill="#0284c7" />
      </svg>
    )
  }
];

export const HOME_CONDITIONS: ConditionItem[] = [
  {
    id: 'fever',
    label: 'Fever',
    keywords: ['fever', 'infection', 'viral', 'flu', 'general', 'internal', 'malaria', 'typhoid'],
    specialtyHint: 'General Physician',
    icon: (
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-12 sm:h-12" fill="none">
        {/* Person Face */}
        <circle cx="32" cy="32" r="13" fill="#fed7aa" />
        <circle cx="25" cy="35" r="3" fill="#f87171" opacity="0.8" />
        <circle cx="39" cy="35" r="3" fill="#f87171" opacity="0.8" />
        <path d="M23 29l4 2m10-2l-4 2" stroke="#475569" strokeWidth="2.2" strokeLinecap="round" />
        {/* Thermometer */}
        <rect x="29" y="36" width="14" height="4.5" rx="2" fill="#ffffff" stroke="#dc2626" strokeWidth="1.8" transform="rotate(-15 29 36)" />
        <circle cx="42" cy="33" r="2.8" fill="#dc2626" />
        {/* Ice Pack on Head */}
        <path d="M24 22c3-4 13-4 16 0z" fill="#38bdf8" />
        <circle cx="32" cy="18" r="2.2" fill="#0284c7" />
      </svg>
    )
  },
  {
    id: 'heart_attack',
    label: 'Heart Attack',
    keywords: ['heart', 'cardio', 'chest pain', 'cardiology', 'angina', 'coronary', 'attack'],
    specialtyHint: 'Cardiologist',
    icon: (
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-12 sm:h-12" fill="none">
        {/* Heart with Lightning Crack */}
        <path d="M32 49l-11-11c-4-4-4-10 0-14s10-4 14 0l-3 3 3-3c4-4 10-4 14 0s4 10 0 14l-14 14z" fill="#f43f5e" />
        <path d="M29 25l-3 7h6l-3 8" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 26l-3-1m39 1l3-1m-37 13l-3 1m37-1l3 1" stroke="#fb7185" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'pregnancy',
    label: 'Pregnancy',
    keywords: ['pregnancy', 'gynae', 'maternity', 'obstetrics', 'women', 'fertility', 'antenatal', 'birth'],
    specialtyHint: 'Gynaecologist',
    icon: (
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-12 sm:h-12" fill="none">
        {/* Silhouette of Pregnant Woman in Pink */}
        <circle cx="32" cy="17" r="5.5" fill="#fed7aa" />
        <path d="M28 13c1-2 4-2 6 0 1 2 0 5-2 6" fill="#475569" />
        <path d="M27 25c3-1 6-1 8 0 3 2 4 6 4 9 0 6-5 10-10 10-2 0-3-1-4-2l-2 12h-4c1-6 2-13 2-19 0-4 2-8 6-10z" fill="#f472b6" />
        <circle cx="34" cy="34" r="3" fill="#fbcfe8" />
      </svg>
    )
  },
  {
    id: 'high_blood',
    label: 'High Blood',
    keywords: ['blood pressure', 'hypertension', 'bp', 'cardio', 'heart', 'vascular'],
    specialtyHint: 'Cardiologist',
    icon: (
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-12 sm:h-12" fill="none">
        {/* Blood Pressure Arm Cuff */}
        <rect x="18" y="22" width="16" height="20" rx="3" fill="#1e3a8a" />
        <path d="M22 22v20m8-20v20" stroke="#3b82f6" strokeWidth="1.5" />
        <path d="M34 32h7a4 4 0 014 4v2" stroke="#0284c7" strokeWidth="2.5" fill="none" />
        <circle cx="45" cy="42" r="5" fill="#f59e0b" />
        {/* Dial Gauge */}
        <circle cx="42" cy="22" r="7" fill="#ffffff" stroke="#1e3a8a" strokeWidth="2.5" />
        <path d="M42 22l3-2" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'piles',
    label: 'Piles',
    keywords: ['piles', 'hemorrhoids', 'fissure', 'fistula', 'surgeon', 'surgery', 'laparoscopic', 'rectal'],
    specialtyHint: 'General Surgeon',
    icon: (
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-12 sm:h-12" fill="none">
        {/* Pelvic Bone Arches in Flesh Peach */}
        <path d="M22 20c3 6 7 10 10 14 3-4 7-8 10-14" stroke="#fed7aa" strokeWidth="7.5" strokeLinecap="round" fill="none" />
        {/* Inflamed Distress Mark */}
        <circle cx="32" cy="36" r="6.5" fill="#f43f5e" />
        <circle cx="32" cy="36" r="3" fill="#be123c" />
        <path d="M32 44v5" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'diarrhea',
    label: 'Diarrhea',
    keywords: ['diarrhea', 'stomach', 'gastro', 'gut', 'acidity', 'abdominal', 'digestion', 'vomiting'],
    specialtyHint: 'Gastroenterologist',
    icon: (
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-12 sm:h-12" fill="none">
        {/* Intestine Digestive Loops in Warm Orange */}
        <path d="M26 20c4-3 10-3 14 0 3 2 4 6 2 9-2 3-8 4-10 6-3 2-4 6-2 9 2 4 8 5 12 3" stroke="#f97316" strokeWidth="5.5" strokeLinecap="round" fill="none" />
        {/* Pain / Cramp Sparks */}
        <path d="M19 28l-3-2m3 8l-3 2m32-10l3-2m-3 8l3 2" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'acne',
    label: 'Acne',
    keywords: ['acne', 'skin', 'derma', 'rash', 'pimples', 'eczema', 'allergy', 'hair'],
    specialtyHint: 'Dermatologist',
    icon: (
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-12 sm:h-12" fill="none">
        {/* Face with Red Spots */}
        <circle cx="32" cy="28" r="13.5" fill="#fed7aa" />
        <circle cx="27" cy="27" r="1.8" fill="#475569" />
        <circle cx="37" cy="27" r="1.8" fill="#475569" />
        <path d="M29 34c1.5 1.5 4.5 1.5 6 0" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" />
        <circle cx="24" cy="23" r="2.5" fill="#ef4444" />
        <circle cx="38" cy="22" r="2.5" fill="#ef4444" />
        <circle cx="32" cy="22" r="2.2" fill="#ef4444" />
        <circle cx="26" cy="32" r="2.2" fill="#ef4444" />
        <circle cx="37" cy="32" r="2.2" fill="#ef4444" />
        <path d="M22 42c3-2 6-3 10-3s7 1 10 3l3 8H19l3-8z" fill="#f472b6" />
      </svg>
    )
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
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-8 border border-slate-100 dark:border-slate-800/90 shadow-xs transition-all">
        <div className="flex items-center justify-between gap-3 mb-6 sm:mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
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

        {/* Clean Circular Grid: Exactly 7 columns on md/desktop matching the reference screenshot */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-y-7 gap-x-3 sm:gap-x-5">
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
                {/* Clean Soft Floating Circular Icon Badge */}
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all bg-[#eef4fc] dark:bg-slate-800/90 ${
                    isSelected
                      ? 'ring-3 ring-emerald-500 shadow-md scale-105'
                      : 'shadow-2xs group-hover:shadow-md group-hover:scale-105'
                  }`}
                >
                  {item.icon}
                </div>

                {/* Clear Label */}
                <span className={`mt-3 text-xs sm:text-[13px] font-bold leading-tight line-clamp-2 transition-colors ${
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
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-8 border border-slate-100 dark:border-slate-800/90 shadow-xs transition-all">
        <div className="flex items-center justify-between gap-3 mb-6 sm:mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
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

        {/* Clean Circular Grid: Exactly 7 columns on md/desktop matching the reference screenshot */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-y-7 gap-x-3 sm:gap-x-5">
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
                {/* Clean Soft Floating Circular Icon Badge */}
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all bg-[#eef4fc] dark:bg-slate-800/90 ${
                    isSelected
                      ? 'ring-3 ring-emerald-500 shadow-md scale-105'
                      : 'shadow-2xs group-hover:shadow-md group-hover:scale-105'
                  }`}
                >
                  {item.icon}
                </div>

                {/* Clear Label */}
                <span className={`mt-3 text-xs sm:text-[13px] font-bold leading-tight transition-colors ${
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
