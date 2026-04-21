import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Inter', 'sans-serif'],
        serif: ['"Instrument Serif"', 'ui-serif', 'Georgia', 'serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#01411C',
          50: '#ecf6ef',
          100: '#d3ead9',
          200: '#a7d5b3',
          300: '#7bc08c',
          500: '#10703a',
          600: '#0a5a2a',
          700: '#074922',
          800: '#04321a',
          900: '#01411C',
          950: '#0a2415',
        },
        accent: {
          gold: '#b9924f',
          softgold: '#e8dcb9',
        },
      },
      borderRadius: {
        xl2: '1.25rem',
        '2xl2': '1.5rem',
      },
      boxShadow: {
        brand: '0 10px 30px -10px rgba(1,65,28,0.18)',
        brandLg: '0 25px 60px -25px rgba(1,65,28,0.32)',
      },
      keyframes: {
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        pulseDot: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.5' } },
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
      },
      animation: {
        floaty: 'floaty 6s ease-in-out infinite',
        pulseDot: 'pulseDot 1.8s ease-in-out infinite',
        marquee: 'marquee 30s linear infinite',
      },
    },
  },
  plugins: [forms, typography],
};
