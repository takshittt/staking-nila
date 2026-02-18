/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./kudoadmin.html",
    "./check-status.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        glass: {
          100: 'rgba(255, 255, 255, 0.1)',
          200: 'rgba(255, 255, 255, 0.2)',
          300: 'rgba(255, 255, 255, 0.3)',
          border: 'rgba(255, 255, 255, 0.2)',
          text: 'rgba(255, 255, 255, 0.9)',
          dark: 'rgba(0, 0, 0, 0.4)',
        },
        brand: {
          primary: '#CE2029',   /* Crimson Red */
          dark: '#0B0E14',      /* Deep Charcoal/Navy */
          muted: '#6B7280',     /* Muted Text Grey */
          light: '#F3F4F6',     /* Light Border/Card Grey */
          success: '#10B981',   /* Success/Growth Green */
          // Aliases for compatibility
          red: '#CE2029',
          black: '#0B0E14',
          accent: '#CE2029',
          secondary: '#b91c1c'
        }
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'blob': 'blob 7s infinite',
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 3s ease-in-out infinite alternate',
      },
      keyframes: {
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 15px rgba(234, 179, 8, 0.1)' },
          '100%': { boxShadow: '0 0 30px rgba(234, 179, 8, 0.3)' },
        }
      }
    },
  },
  plugins: [],
}
