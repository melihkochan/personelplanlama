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
        }
      }
    },
  },
  plugins: [],
}