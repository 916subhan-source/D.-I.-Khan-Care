import React from 'react';
import { ArrowRight, ChevronRight, Sparkles } from 'lucide-react';

export interface SpecialtyItem {
  id: string;
  label: string;
  sublabel?: string;
  badge?: string;
  colorBg: string;
  borderColor: string;
  icon: React.ReactNode;
}

export interface ConditionItem {
  id: string;
  label: string;
  keywords: string[];
  specialtyHint?: string;
  colorBg: string;
  borderColor: string;
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
    colorBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
    borderColor: 'border-amber-200 dark:border-amber-800/80',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" fill="#fef3c7" className="dark:fill-amber-950/60" />
        <path d="M16 28c3-4 6-6 10-5 3 1 5 4 8 3" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="21" cy="20" r="7" stroke="#b45309" strokeWidth="2.5" fill="none" />
        <path d="M26 25l6 6" stroke="#b45309" strokeWidth="3" strokeLinecap="round" />
        <circle cx="21" cy="20" r="2" fill="#f59e0b" />
      </svg>
    )
  },
  {
    id: 'Gynaecologist',
    label: 'Gynecologist',
    sublabel: 'Women & Pregnancy',
    colorBg: 'bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300',
    borderColor: 'border-pink-200 dark:border-pink-800/80',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" fill="#fce7f3" className="dark:fill-pink-950/60" />
        <circle cx="24" cy="15" r="4.5" fill="#ec4899" />
        <path d="M24 21c-4 0-7 3.5-7 8v6h14v-6c0-4.5-3-8-7-8z" fill="#f43f5e" />
        <path d="M26 27c2 1 3.5 3 3.5 5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'Urologist',
    label: 'Urologist',
    sublabel: 'Kidney & Bladder',
    colorBg: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300',
    borderColor: 'border-sky-200 dark:border-sky-800/80',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" fill="#e0f2fe" className="dark:fill-sky-950/60" />
        <path d="M19 14c-3 3-4 7-2 11 2 4 6 7 7 11 1-4 5-7 7-11 2-4 1-8-2-11-2 3-8 3-10 0z" fill="#0284c7" />
        <path d="M20 22h8" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'Gastroenterologist',
    label: 'Gastroenterologist',
    sublabel: 'Stomach & Liver',
    colorBg: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300',
    borderColor: 'border-orange-200 dark:border-orange-800/80',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" fill="#ffedd5" className="dark:fill-orange-950/60" />
        <path d="M24 13v6c0 3-2 6-5 6-3 0-5 3-5 6 0 4 3 7 7 7 5 0 9-4 9-9 0-4-2-7-6-8v-4" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="22" cy="28" r="2" fill="#f97316" />
      </svg>
    )
  },
  {
    id: 'Dentist',
    label: 'Dentist',
    sublabel: 'Teeth & Gums',
    colorBg: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300',
    borderColor: 'border-cyan-200 dark:border-cyan-800/80',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" fill="#cffafe" className="dark:fill-cyan-950/60" />
        <path d="M18 16c-3 0-5 2-5 5 0 5 2 9 4 13 1 2 3 2 4 0l1-5h4l1 5c1 2 3 2 4 0 2-4 4-8 4-13 0-3-2-5-5-5-2 0-3 1-5 2-2-1-3-2-5-2z" fill="#0891b2" />
        <path d="M20 20c0 2 2 4 4 4s4-2 4-4" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'General Surgeon',
    label: 'General Surgeon',
    sublabel: 'Surgery & Laparoscopy',
    colorBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
    borderColor: 'border-emerald-200 dark:border-emerald-800/80',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" fill="#d1fae5" className="dark:fill-emerald-950/60" />
        <path d="M15 33l13-13m0 0l3-3a2 2 0 013 3l-3 3m-3-3l3 3" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 34l3-1-2-2-1 3z" fill="#047857" />
        <circle cx="34" cy="14" r="2" fill="#10b981" />
      </svg>
    )
  },
  {
    id: 'ENT Specialist',
    label: 'ENT Specialist',
    sublabel: 'Ear, Nose & Throat',
    colorBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300',
    borderColor: 'border-rose-200 dark:border-rose-800/80',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" fill="#ffe4e6" className="dark:fill-rose-950/60" />
        <path d="M19 18c0-3 2-5 5-5s5 2 5 5c0 4-4 6-4 10v2" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <circle cx="25" cy="34" r="1.5" fill="#e11d48" />
        <path d="M16 23c-2 2-3 4-2 7 1 3 3 4 5 3" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    )
  },
  {
    id: 'Orthopedic Surgeon',
    label: 'Orthopedic Surgeon',
    sublabel: 'Bones & Joints',
    colorBg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300',
    borderColor: 'border-blue-200 dark:border-blue-800/80',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" fill="#dbeafe" className="dark:fill-blue-950/60" />
        <path d="M16 16l16 16m-4-16a3 3 0 114 4m-12 12a3 3 0 114 4" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="24" cy="24" r="4" fill="#3b82f6" />
      </svg>
    )
  },
  {
    id: 'Neurologist',
    label: 'Neurologist',
    sublabel: 'Brain & Nerves',
    colorBg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300',
    borderColor: 'border-purple-200 dark:border-purple-800/80',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" fill="#f3e8ff" className="dark:fill-purple-950/60" />
        <path d="M24 14c-4 0-7 2-7 5 0 2 1 3 2 4-2 1-3 3-3 5 0 3 3 6 8 6s8-3 8-6c0-2-1-4-3-5 1-1 2-2 2-4 0-3-3-5-7-5z" stroke="#9333ea" strokeWidth="2.2" fill="none" />
        <path d="M24 16v16m-4-10c2 2 6 2 8 0" stroke="#a855f7" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'Pediatrician',
    label: 'Child Specialist',
    sublabel: 'Baby & Kids',
    colorBg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300',
    borderColor: 'border-indigo-200 dark:border-indigo-800/80',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" fill="#e0e7ff" className="dark:fill-indigo-950/60" />
        <circle cx="24" cy="23" r="8" fill="#4f46e5" />
        <path d="M21 21h.01M27 21h.01" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M22 25c1 1 3 1 4 0" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M24 15c0-2-2-3-2-3" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'Ophthalmologist',
    label: 'Eye Specialist',
    sublabel: 'Vision & Retina',
    colorBg: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300',
    borderColor: 'border-teal-200 dark:border-teal-800/80',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" fill="#ccfbf1" className="dark:fill-teal-950/60" />
        <circle cx="18" cy="24" r="5" stroke="#0d9488" strokeWidth="2.5" fill="none" />
        <circle cx="30" cy="24" r="5" stroke="#0d9488" strokeWidth="2.5" fill="none" />
        <path d="M23 24h2" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M13 22l-2-2m26 0l2 2" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'General Physician',
    label: 'General Physician',
    sublabel: 'Family Care',
    colorBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
    borderColor: 'border-emerald-200 dark:border-emerald-800/80',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" fill="#d1fae5" className="dark:fill-emerald-950/60" />
        <path d="M18 16v6a6 6 0 0012 0v-6" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M24 28v5a3 3 0 003 3h1a2 2 0 002-2v-1" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <circle cx="30" cy="33" r="2.5" fill="#047857" />
        <circle cx="18" cy="15" r="1.5" fill="#047857" />
        <circle cx="30" cy="15" r="1.5" fill="#047857" />
      </svg>
    )
  },
  {
    id: 'Cardiologist',
    label: 'Cardiologist',
    sublabel: 'Heart & Vascular',
    colorBg: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300',
    borderColor: 'border-red-200 dark:border-red-800/80',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" fill="#fee2e2" className="dark:fill-red-950/60" />
        <path d="M24 33l-7-7c-2.5-2.5-2.5-6.5 0-9s6.5-2.5 9 0l-2 2 2-2c2.5-2.5 6.5-2.5 9 0s2.5 6.5 0 9l-9 9z" fill="#dc2626" />
        <path d="M19 24h3l2-3 2 6 2-3h3" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    id: 'Laparoscopic Surgeon',
    label: 'Laparoscopic Surgeon',
    sublabel: 'Minimally Invasive',
    colorBg: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300',
    borderColor: 'border-teal-200 dark:border-teal-800/80',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" fill="#ccfbf1" className="dark:fill-teal-950/60" />
        <circle cx="20" cy="20" r="5" stroke="#0f766e" strokeWidth="2.5" fill="none" />
        <path d="M24 24l8 8m-4-2l4 4" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="20" cy="20" r="2" fill="#14b8a6" />
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
    colorBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
    borderColor: 'border-amber-200 dark:border-amber-800/80',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" fill="#fef3c7" className="dark:fill-amber-950/60" />
        <circle cx="24" cy="18" r="5" fill="#f59e0b" />
        <path d="M17 32c0-4 3.5-7 7-7s7 3 7 7" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M28 15l4-2m-16 2l-4-2m10-5v3" stroke="#b45309" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'heart_attack',
    label: 'Heart Attack',
    keywords: ['heart', 'cardio', 'chest pain', 'cardiology', 'angina', 'coronary', 'attack'],
    specialtyHint: 'Cardiologist',
    colorBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300',
    borderColor: 'border-rose-200 dark:border-rose-800/80',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" fill="#ffe4e6" className="dark:fill-rose-950/60" />
        <path d="M24 33l-7-7c-2.5-2.5-2.5-6.5 0-9s6.5-2.5 9 0l-2 2 2-2c2.5-2.5 6.5-2.5 9 0s2.5 6.5 0 9l-9 9z" fill="#f43f5e" />
        <path d="M22 20l-2 5h4l-2 5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    id: 'pregnancy',
    label: 'Pregnancy',
    keywords: ['pregnancy', 'gynae', 'maternity', 'obstetrics', 'women', 'fertility', 'antenatal', 'birth'],
    specialtyHint: 'Gynaecologist',
    colorBg: 'bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300',
    borderColor: 'border-pink-200 dark:border-pink-800/80',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" fill="#fce7f3" className="dark:fill-pink-950/60" />
        <circle cx="24" cy="15" r="4" fill="#ec4899" />
        <path d="M21 22c2-1 4-1 6 0 2 2 3 6 1 10-1 2-3 3-5 3s-4-2-4-5c0-4 1-7 2-8z" fill="#db2777" />
        <circle cx="25" cy="26" r="2" fill="#fbcfe8" />
      </svg>
    )
  },
  {
    id: 'high_blood',
    label: 'High Blood',
    keywords: ['blood pressure', 'hypertension', 'bp', 'cardio', 'heart', 'vascular'],
    specialtyHint: 'Cardiologist',
    colorBg: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300',
    borderColor: 'border-red-200 dark:border-red-800/80',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" fill="#fee2e2" className="dark:fill-red-950/60" />
        <rect x="17" y="17" width="14" height="15" rx="3" fill="#ef4444" />
        <circle cx="24" cy="23" r="3.5" fill="#ffffff" />
        <path d="M24 23l2-2" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M21 32v2a2 2 0 002 2h2a2 2 0 002-2v-2" stroke="#dc2626" strokeWidth="2" />
      </svg>
    )
  },
  {
    id: 'piles',
    label: 'Piles',
    keywords: ['piles', 'hemorrhoids', 'fissure', 'fistula', 'surgeon', 'surgery', 'laparoscopic', 'rectal'],
    specialtyHint: 'General Surgeon',
    colorBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
    borderColor: 'border-amber-200 dark:border-amber-800/80',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" fill="#fef3c7" className="dark:fill-amber-950/60" />
        <circle cx="24" cy="24" r="7" stroke="#d97706" strokeWidth="2.5" fill="none" />
        <circle cx="24" cy="24" r="3" fill="#b45309" />
        <path d="M24 13v3m0 16v3m-11-11h3m16 0h3" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'diarrhea',
    label: 'Diarrhea',
    keywords: ['diarrhea', 'stomach', 'gastro', 'gut', 'acidity', 'abdominal', 'digestion', 'vomiting'],
    specialtyHint: 'Gastroenterologist',
    colorBg: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300',
    borderColor: 'border-orange-200 dark:border-orange-800/80',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" fill="#ffedd5" className="dark:fill-orange-950/60" />
        <path d="M20 16c2 0 3 2 5 2s3-2 5-2c2 0 3 2 3 5 0 5-3 8-6 11-1 1-3 1-4 0-3-3-6-6-6-11 0-3 1-5 3-5z" fill="#ea580c" />
        <path d="M19 28l2 2 4-4" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    id: 'acne',
    label: 'Acne',
    keywords: ['acne', 'skin', 'derma', 'rash', 'pimples', 'eczema', 'allergy', 'hair'],
    specialtyHint: 'Dermatologist',
    colorBg: 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300',
    borderColor: 'border-yellow-200 dark:border-yellow-800/80',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" fill="#fef9c3" className="dark:fill-yellow-950/60" />
        <circle cx="24" cy="24" r="8" fill="#eab308" />
        <circle cx="21" cy="22" r="1.5" fill="#ffffff" />
        <circle cx="27" cy="22" r="1.5" fill="#ffffff" />
        <circle cx="24" cy="27" r="1.5" fill="#ca8a04" />
        <circle cx="29" cy="27" r="1" fill="#ca8a04" />
        <circle cx="19" cy="26" r="1" fill="#ca8a04" />
      </svg>
    )
  },
  {
    id: 'diabetes',
    label: 'Diabetes',
    keywords: ['diabetes', 'sugar', 'insulin', 'endocrine', 'glucose', 'metabolic'],
    specialtyHint: 'General Physician',
    colorBg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300',
    borderColor: 'border-blue-200 dark:border-blue-800/80',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" fill="#dbeafe" className="dark:fill-blue-950/60" />
        <path d="M24 14c-4 5-7 9-7 13 0 4 3 7 7 7s7-3 7-7c0-4-3-8-7-13z" fill="#2563eb" />
        <path d="M22 25h4m-2-2v4" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'joint_pain',
    label: 'Joint Pain',
    keywords: ['joint', 'ortho', 'bone', 'knee', 'spine', 'fracture', 'arthritis', 'back pain'],
    specialtyHint: 'Orthopedic Surgeon',
    colorBg: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300',
    borderColor: 'border-sky-200 dark:border-sky-800/80',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" fill="#e0f2fe" className="dark:fill-sky-950/60" />
        <circle cx="24" cy="24" r="5" fill="#0284c7" />
        <path d="M19 19l-4-4m14 14l4 4m-4-14l4-4m-14 14l-4 4" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'teeth',
    label: 'Toothache',
    keywords: ['tooth', 'dental', 'dentist', 'teeth', 'gum', 'cavity', 'root canal', 'oral'],
    specialtyHint: 'Dentist',
    colorBg: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300',
    borderColor: 'border-cyan-200 dark:border-cyan-800/80',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" fill="#cffafe" className="dark:fill-cyan-950/60" />
        <path d="M18 16c-3 0-5 2-5 5 0 5 2 9 4 13 1 2 3 2 4 0l1-5h4l1 5c1 2 3 2 4 0 2-4 4-8 4-13 0-3-2-5-5-5-2 0-3 1-5 2-2-1-3-2-5-2z" fill="#0891b2" />
        <path d="M28 14l3-2m-1 5l3 1" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'throat_ear',
    label: 'Throat Pain',
    keywords: ['ent', 'throat', 'ear', 'nose', 'sinus', 'tonsils', 'hearing'],
    specialtyHint: 'ENT Specialist',
    colorBg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300',
    borderColor: 'border-purple-200 dark:border-purple-800/80',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" fill="#f3e8ff" className="dark:fill-purple-950/60" />
        <path d="M24 14v16m-5-8h10" stroke="#9333ea" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="24" cy="34" r="2" fill="#a855f7" />
      </svg>
    )
  },
  {
    id: 'eye_vision',
    label: 'Eye Problem',
    keywords: ['eye', 'vision', 'ophthalmo', 'cataract', 'sight', 'optics'],
    specialtyHint: 'Ophthalmologist',
    colorBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
    borderColor: 'border-emerald-200 dark:border-emerald-800/80',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" fill="#d1fae5" className="dark:fill-emerald-950/60" />
        <path d="M14 24s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" stroke="#059669" strokeWidth="2.5" fill="none" />
        <circle cx="24" cy="24" r="3.5" fill="#047857" />
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
    <div className="space-y-7 sm:space-y-10 my-4 sm:my-7">
      {/* ── Section 1: Consult Best Doctors by Specialty ── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200/90 dark:border-slate-800 shadow-sm transition-all">
        <div className="flex items-center justify-between gap-3 mb-5 sm:mb-6">
          <div>
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Consult best doctors online
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              Verified private practitioners &amp; clinical consultants in D.I. Khan
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

        {/* Circular Grid / Carousel */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3 sm:gap-5">
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
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:-translate-y-0.5'
                }`}
              >
                {/* Avatar Circle */}
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all shadow-xs group-hover:shadow-md ${
                    item.colorBg
                  } border ${
                    isSelected
                      ? 'border-emerald-500 ring-2 ring-emerald-400 shadow-md scale-105'
                      : `${item.borderColor} group-hover:scale-105`
                  }`}
                >
                  {item.icon}
                </div>

                {/* Title & Subtitle */}
                <span className={`mt-2.5 text-xs sm:text-[13px] font-bold leading-tight line-clamp-2 transition-colors ${
                  isSelected
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-slate-800 dark:text-slate-200 group-hover:text-clinic-700 dark:group-hover:text-emerald-300'
                }`}>
                  {item.label}
                </span>
                {item.sublabel && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium hidden sm:block mt-0.5 truncate max-w-full">
                    {item.sublabel}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Section 2: Search Doctor by Health Condition ── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200/90 dark:border-slate-800 shadow-sm transition-all">
        <div className="flex items-center justify-between gap-3 mb-5 sm:mb-6">
          <div>
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Search doctor by condition
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              Common symptoms, diseases, and clinical diagnoses
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

        {/* Circular Grid / Carousel */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-5">
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
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:-translate-y-0.5'
                }`}
              >
                {/* Avatar Circle */}
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all shadow-xs group-hover:shadow-md ${
                    item.colorBg
                  } border ${
                    isSelected
                      ? 'border-emerald-500 ring-2 ring-emerald-400 shadow-md scale-105'
                      : `${item.borderColor} group-hover:scale-105`
                  }`}
                >
                  {item.icon}
                </div>

                {/* Title */}
                <span className={`mt-2.5 text-xs sm:text-[13px] font-bold leading-tight transition-colors ${
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

