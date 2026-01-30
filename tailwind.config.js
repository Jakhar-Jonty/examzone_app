/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#16a34a', // Green-600
          dark: '#15803d',
          light: '#22c55e',
        },
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        border: '#e5e7eb',
        background: {
          DEFAULT: '#ffffff',
          dark: '#1A202C',
        },
        foreground: {
          DEFAULT: '#111827',
          dark: '#F7FAFC',
        },
        muted: {
          DEFAULT: '#f3f4f6',
          foreground: '#6b7280',
        },
        card: {
          DEFAULT: '#ffffff',
          foreground: '#111827',
          dark: '#2D3748',
        },
        surface: {
          DEFAULT: '#F7F8FA',
          dark: '#2D3748',
        },
      },
    },
  },
  plugins: [],
}

