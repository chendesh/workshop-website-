/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          dark:           '#0f172a',
          card:           '#1e293b',
          accent:         '#f59e0b',
          'accent-hover': '#d97706',
          success:        '#22c55e',
          warning:        '#f59e0b',
          danger:         '#ef4444',
          light:          '#ffffff',
          'light-surface':'#f8fafc',
          'light-border': '#e2e8f0',
        },
      },
      fontFamily: {
        heading: ['Outfit', 'sans-serif'],
        body:    ['Inter',  'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-gradient':   'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      },
      animation: {
        'fade-in':       'fadeIn 0.6s ease-out forwards',
        'fade-in-up':    'fadeInUp 0.6s ease-out forwards',
        'fade-in-down':  'fadeInDown 0.6s ease-out forwards',
        'slide-in-left': 'slideInLeft 0.6s ease-out forwards',
        'slide-in-right':'slideInRight 0.6s ease-out forwards',
        'scale-in':      'scaleIn 0.4s ease-out forwards',
        'pulse-glow':    'pulseGlow 2s ease-in-out infinite',
        'float':         'float 6s ease-in-out infinite',
        'shimmer':       'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn:      { '0%': { opacity: '0' },                                  '100%': { opacity: '1' } },
        fadeInUp:    { '0%': { opacity: '0', transform: 'translateY(30px)' },   '100%': { opacity: '1', transform: 'translateY(0)' } },
        fadeInDown:  { '0%': { opacity: '0', transform: 'translateY(-30px)' },  '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideInLeft: { '0%': { opacity: '0', transform: 'translateX(-30px)' },  '100%': { opacity: '1', transform: 'translateX(0)' } },
        slideInRight:{ '0%': { opacity: '0', transform: 'translateX(30px)' },   '100%': { opacity: '1', transform: 'translateX(0)' } },
        scaleIn:     { '0%': { opacity: '0', transform: 'scale(0.9)' },         '100%': { opacity: '1', transform: 'scale(1)' } },
        pulseGlow:   { '0%, 100%': { boxShadow: '0 0 20px rgba(245,158,11,0.3)' }, '50%': { boxShadow: '0 0 40px rgba(245,158,11,0.6)' } },
        float:       { '0%, 100%': { transform: 'translateY(0px)' },            '50%': { transform: 'translateY(-20px)' } },
        shimmer:     { '0%': { backgroundPosition: '-200% 0' },                 '100%': { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [],
};