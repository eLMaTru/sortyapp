/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        demo: { DEFAULT: '#8b5cf6', dark: '#7c3aed' },
        real: { DEFAULT: '#10b981', dark: '#059669' },
      },
    },
  },
  plugins: [],
};
