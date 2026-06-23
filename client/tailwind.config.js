/** @type {import('tailwindcss').Config} */
import colors from 'tailwindcss/colors';

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        ink: colors.slate,
      },
      boxShadow: {
        soft: '0 2px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.05)',
        glow: '0 0 40px -10px rgba(20, 184, 166, 0.35)',
        card: '0 1px 3px rgba(15, 23, 42, 0.06), 0 8px 24px -6px rgba(15, 23, 42, 0.08)',
      },
      backgroundImage: {
        'mesh': 'radial-gradient(at 40% 20%, rgba(20, 184, 166, 0.12) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(15, 118, 110, 0.08) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(45, 212, 191, 0.06) 0px, transparent 50%)',
        'sidebar': 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      },
    },
  },
  plugins: [],
};
