/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './public/**/*.html'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Inter"', 'sans-serif'],
        lemon: ['"Inter"', 'sans-serif'],
      },
      colors: {
        'pakistan-green': '#01411C',
        'whatsapp-green': '#25D366',
      },
      animation: {
        'spin-slow': 'spin 20s linear infinite',
        float: 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};
