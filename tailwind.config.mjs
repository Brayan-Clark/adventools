import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        night: {
          950: '#070b16',
          900: '#0b1020',
          800: '#121a33',
          700: '#1b2547',
          600: '#27335f',
        },
        gold: {
          300: '#f5d98b',
          400: '#eec36a',
          500: '#e0a83c',
          600: '#c98a24',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'hero-glow':
          'radial-gradient(1200px 600px at 20% -10%, rgba(124,58,237,0.35), transparent 60%), radial-gradient(900px 500px at 90% 10%, rgba(224,168,60,0.18), transparent 55%)',
      },
      boxShadow: {
        soft: '0 8px 40px -12px rgba(0,0,0,0.45)',
        'soft-gold': '0 10px 40px -10px rgba(224,168,60,0.45)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s ease-out both',
        'glow-pulse': 'glow-pulse 3.5s ease-in-out infinite',
        marquee: 'marquee 30s linear infinite',
      },
    },
  },
  plugins: [typography],
};
