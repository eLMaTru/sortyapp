/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e6f0ff',
          100: '#cce0ff',
          200: '#99c2ff',
          300: '#66a3ff',
          400: '#3385ff',
          500: '#0066FF',
          600: '#0052cc',
          700: '#003d99',
          800: '#002966',
          900: '#001433',
        },
        room: {
          DEFAULT: '#FF3333',
          dark: '#CC2929',
          light: '#FF6666',
        },
        success: {
          DEFAULT: '#00CC00',
          dark: '#009900',
          light: '#33DD33',
        },
        accent: {
          orange: '#FFA500',
          gold: '#FFCC00',
          purple: '#5555FF',
          teal: '#00CCCC',
        },
        demo: { DEFAULT: '#8B5CF6', dark: '#7C3AED', light: '#A78BFA' },
        real: { DEFAULT: '#10B981', dark: '#059669', light: '#34D399' },
        surface: {
          light: '#F5F5F0',
          DEFAULT: '#FFFFFF',
          dark: '#1A1A1A',
          'dark-2': '#2A2A2A',
          'dark-3': '#333333',
        },
      },
    },
  },
  plugins: [],
};
