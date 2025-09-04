import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // WindTre Brand Colors ESATTI
        windtre: {
          orange: '#FF6900',
          purple: '#7B2CBF',
          dark: '#0a0a0a',
          gray: '#6b7280'
        }
      },
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
        'jetbrains': ['JetBrains Mono', 'monospace']
      },
      backdropBlur: {
        'glass': '20px',
      }
    },
  },
  plugins: [],
  darkMode: 'class'
} satisfies Config