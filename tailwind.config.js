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
        velune: {
          50: '#fef2f2',
          100: '#ffe1e4',
          200: '#ffc8cd',
          300: '#ffa1aa',
          400: '#fd6c7a',
          500: '#ed5564', // Velune signature coral
          600: '#d93144',
          700: '#b62334',
          800: '#97202f',
          900: '#7f202c',
          950: '#460c13',
        },
        dark: {
          bg: '#0A0B0E',
          surface: '#13151A',
          card: '#1A1D24',
          elevated: '#222630',
          border: 'rgba(255, 255, 255, 0.08)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'soundwave': 'soundwave 1.2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.25s ease-out',
        'scale-up': 'scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        soundwave: {
          '0%, 100%': { height: '4px' },
          '50%': { height: '16px' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleUp: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        }
      }
    },
  },
  plugins: [],
}
