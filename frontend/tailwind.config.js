/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Stat colors
        'str': '#ef4444', // red - Strength
        'dex': '#10b981', // green - Dexterity
        'con': '#f59e0b', // amber - Constitution
        'int': '#3b82f6', // blue - Intelligence
        'wis': '#8b5cf6', // purple - Wisdom
        'cha': '#ec4899', // pink - Charisma
        // Theme colors
        'primary': '#7c3aed', // violet
        'secondary': '#06b6d4', // cyan
      },
      fontFamily: {
        'display': ['"Cinzel"', 'serif'],
        'body': ['"Inter"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
