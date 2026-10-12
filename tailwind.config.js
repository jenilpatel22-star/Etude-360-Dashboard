/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef5fd', 100: '#cde2fb', 200: '#9ec5f4', 300: '#6da7ec', 400: '#3987e5',
          500: '#2a78d6', 600: '#256abf', 700: '#1c5cab', 800: '#184f95', 900: '#0d366b',
        },
        surface: { DEFAULT: '#fcfcfb', dark: '#1a1a19' },
        ink: { DEFAULT: '#0b0b0b', secondary: '#52514e', muted: '#77766f' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
