/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0a0f1e',
        surface: '#111827',
        surface2: '#1f2937',
        accent: '#14b8a6',
        accentHover: '#0d9488',
        textPrimary: '#f9fafb',
        textSecondary: '#9ca3af',
        emergency: '#ef4444',
        sameday: '#f97316',
        routine: '#22c55e',
        needsinfo: '#eab308',
      },
    },
  },
  plugins: [],
}
