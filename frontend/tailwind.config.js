/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary brand — dark teal (D.I. Khan Care)
        clinic: {
          50:  '#f0faf8',
          100: '#d9f2ed',
          200: '#b3e4db',
          300: '#7dcec3',
          400: '#45b3a6',
          500: '#2a9488',
          600: '#1e776b',
          700: '#1a6359',  // primary buttons
          800: '#174f47',
          900: '#143d38',  // sidebar, dark surfaces
          950: '#0c2824',
        },
        // Amber — holds, warnings, pending
        hold: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        // Rose — errors, rejected, revoked
        danger: {
          50:  '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
        },
        // Emerald — paid, verified, active
        paid: {
          50:  '#ecfdf5',
          100: '#d1fae5',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        // Slate — neutral text, borders (keep Tailwind defaults, extend)
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        heading: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'none': '0px',
        'sm': '2px',
        'DEFAULT': '3px',
        'md': '4px',
        'lg': '5px',
        'xl': '6px',
        '2xl': '6px',
        '3xl': '8px',
        '4xl': '8px',
        'full': '9999px',
      },
      boxShadow: {
        'card': '0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)',
        'sidebar': '4px 0 24px rgba(0,0,0,0.15)',
        'glow-clinic': '0 0 24px rgba(26,99,89,0.2)',
        'glow-gold': '0 0 24px rgba(245,158,11,0.25)',
        'glow-emerald': '0 0 20px rgba(16,185,129,0.2)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.15)',
        'kpi': '0 2px 8px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.05)',
        'kpi-accent': '0 4px 16px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)',
        'btn': '0 2px 8px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
        'btn-hover': '0 6px 20px rgba(0,0,0,0.16), 0 2px 6px rgba(0,0,0,0.1)',
        'modal': '0 25px 60px rgba(0,0,0,0.25), 0 8px 20px rgba(0,0,0,0.15)',
        'xs': '0 1px 2px rgba(0,0,0,0.05)',
        '2xs': '0 0 0 1px rgba(0,0,0,0.04)',
      },
      animation: {
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(0.85)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
