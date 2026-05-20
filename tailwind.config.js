/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./contexts/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./services/**/*.ts",
    "./utils/**/*.ts",
  ],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
}
