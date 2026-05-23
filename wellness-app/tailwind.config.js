/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        orange: {
          50: '#FFF1E8',
          100: '#FFE3D1',
          400: '#FF8C5A',
          500: '#FF6D2A',
          600: '#E55A1A',
        },
        teal: {
          400: '#38BDF8',
          500: '#0EA5E9',
        },
        violet: {
          400: '#C084FC',
          500: '#A855F7',
        },
        emerald: {
          400: '#34D399',
          500: '#10B981',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
