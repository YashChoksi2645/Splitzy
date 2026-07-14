/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2f3ff',
          100: '#e6e8ff',
          400: '#7c7ff2',
          500: '#5b5fef',
          600: '#4547d6',
          700: '#3638ab'
        },
        coral: {
          500: '#ff6b6b',
          600: '#f0524f'
        },
        mint: {
          500: '#2fd0a5',
          600: '#1fb08a'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        card: '0 2px 10px rgba(17, 24, 39, 0.06)'
      }
    }
  },
  plugins: []
};
