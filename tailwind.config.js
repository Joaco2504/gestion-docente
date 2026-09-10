/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1209ff',
          hover: '#0e07cc',
          light: '#f0efff',
          muted: '#e2e0ff',
        },
        surface: {
          DEFAULT: '#ffffff',
          dark: '#161926',
          hover: '#f4f3ff',
          border: '#e4e2f5',
        },
        canvas: {
          DEFAULT: '#faf8ff',
          light: '#faf8ff',
          dark: '#11131d',
        },
        academic: {
          promo: '#059669', // Emerald
          regular: '#d97706', // Amber
          libre: '#dc2626', // Rose / Red
          recup: '#7c3aed', // Purple for recuperatorios
        },
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        text: {
          primary: '#111827',
          secondary: '#4b5563',
          muted: '#9ca3af',
        }
      },
      fontFamily: {
        sans: ['"Hanken Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(18, 9, 255, 0.04), 0 1px 2px -1px rgba(18, 9, 255, 0.04)',
      }
    },
  },
  plugins: [],
}
