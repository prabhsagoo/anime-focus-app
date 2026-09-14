/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        themeYellow: '#FCD34D',
        panelBg: 'rgba(23, 23, 23, 0.85)',
      },
    },
  },
  plugins: [],
};