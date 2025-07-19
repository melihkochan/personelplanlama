/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-out-left': 'slideOutLeft 0.3s ease-in',
        'slide-out-right': 'slideOutRight 0.3s ease-in',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { 
            opacity: '0', 
            transform: 'translateY(10px)' 
          },
          '100%': { 
            opacity: '1', 
            transform: 'translateY(0)' 
          }
        },
        slideInRight: {
          '0%': { 
            opacity: '0', 
            transform: 'translateX(100px) scale(0.95)' 
          },
          '100%': { 
            opacity: '1', 
            transform: 'translateX(0) scale(1)' 
          }
        },
        slideIn: {
          '0%': { 
            opacity: '0', 
            transform: 'translateX(0) scale(0.95)' 
          },
          '100%': { 
            opacity: '1', 
            transform: 'translateX(0) scale(1)' 
          }
        },
        slideOutLeft: {
          '0%': { 
            opacity: '1', 
            transform: 'translateX(0) scale(1)' 
          },
          '100%': { 
            opacity: '0', 
            transform: 'translateX(-100px) scale(0.95)' 
          }
        },
        slideOutRight: {
          '0%': { 
            opacity: '1', 
            transform: 'translateX(0) scale(1)' 
          },
          '100%': { 
            opacity: '0', 
            transform: 'translateX(100px) scale(0.95)' 
          }
        }
      }
    },
  },
  plugins: [
    function({ addUtilities }) {
      const newUtilities = {
        '.scrollbar-thin': {
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgb(209 213 219) rgb(243 244 246)',
        },
        '.scrollbar-thumb-gray-300': {
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgb(209 213 219)',
            borderRadius: '6px',
          },
        },
        '.scrollbar-track-gray-100': {
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'rgb(243 244 246)',
            borderRadius: '6px',
          },
        },
      }
      addUtilities(newUtilities)
    }
  ],
}