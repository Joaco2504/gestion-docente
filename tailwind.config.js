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
          DEFAULT: 'rgb(var(--color-primary-rgb, 26 86 219) / <alpha-value>)',
          hover: 'rgb(var(--color-primary-hover-rgb, 30 66 159) / <alpha-value>)',
          light: 'var(--color-primary-light, #ebf5ff)',
          muted: 'var(--color-primary-muted, #d0e1fd)',
          dark: 'rgb(var(--color-primary-rgb, 26 86 219) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'var(--surface)',
          hover: 'var(--surface-hover)',
          border: 'var(--surface-border)',
        },
        canvas: {
          DEFAULT: 'var(--canvas)',
          light: '#faf8ff',
          dark: '#0b0f19',
        },
        academic: {
          promo: '#059669', // Emerald
          regular: '#d97706', // Amber
          libre: '#dc2626', // Rose / Red
          recup: '#7c3aed', // Purple
        },
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        }
      },
      fontFamily: {
        sans: ['"Hanken Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(18, 9, 255, 0.04), 0 1px 2px -1px rgba(18, 9, 255, 0.04)',
        'elevated': '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        'elevated-dark': '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out forwards',
        slideUp: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        pulseGlow: 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 1.8s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
