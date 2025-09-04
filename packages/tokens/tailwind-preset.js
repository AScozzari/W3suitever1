/**
 * W3 Suite Tailwind CSS Preset
 * WindTre Brand Colors & Glassmorphism Design System
 */

import plugin from 'tailwindcss/plugin';

/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      // ==================== BRAND COLORS ====================
      colors: {
        // Primary WindTre Orange
        primary: {
          50: 'rgb(var(--color-primary-50) / <alpha-value>)',
          100: 'rgb(var(--color-primary-100) / <alpha-value>)',
          200: 'rgb(var(--color-primary-200) / <alpha-value>)',
          300: 'rgb(var(--color-primary-300) / <alpha-value>)',
          400: 'rgb(var(--color-primary-400) / <alpha-value>)',
          500: 'rgb(var(--color-primary-500) / <alpha-value>)', // #ff6900
          600: 'rgb(var(--color-primary-600) / <alpha-value>)',
          700: 'rgb(var(--color-primary-700) / <alpha-value>)',
          800: 'rgb(var(--color-primary-800) / <alpha-value>)',
          900: 'rgb(var(--color-primary-900) / <alpha-value>)',
          950: 'rgb(var(--color-primary-950) / <alpha-value>)',
          DEFAULT: 'rgb(var(--color-primary-500) / <alpha-value>)'
        },
        
        // Secondary WindTre Purple  
        secondary: {
          50: 'rgb(var(--color-secondary-50) / <alpha-value>)',
          100: 'rgb(var(--color-secondary-100) / <alpha-value>)',
          200: 'rgb(var(--color-secondary-200) / <alpha-value>)',
          300: 'rgb(var(--color-secondary-300) / <alpha-value>)',
          400: 'rgb(var(--color-secondary-400) / <alpha-value>)',
          500: 'rgb(var(--color-secondary-500) / <alpha-value>)', // #7b2cbf
          600: 'rgb(var(--color-secondary-600) / <alpha-value>)',
          700: 'rgb(var(--color-secondary-700) / <alpha-value>)',
          800: 'rgb(var(--color-secondary-800) / <alpha-value>)',
          900: 'rgb(var(--color-secondary-900) / <alpha-value>)',
          950: 'rgb(var(--color-secondary-950) / <alpha-value>)',
          DEFAULT: 'rgb(var(--color-secondary-500) / <alpha-value>)'
        },

        // Neutral grays for enterprise UI
        neutral: {
          50: 'rgb(var(--color-neutral-50) / <alpha-value>)',
          100: 'rgb(var(--color-neutral-100) / <alpha-value>)',
          200: 'rgb(var(--color-neutral-200) / <alpha-value>)',
          300: 'rgb(var(--color-neutral-300) / <alpha-value>)',
          400: 'rgb(var(--color-neutral-400) / <alpha-value>)',
          500: 'rgb(var(--color-neutral-500) / <alpha-value>)',
          600: 'rgb(var(--color-neutral-600) / <alpha-value>)',
          700: 'rgb(var(--color-neutral-700) / <alpha-value>)',
          800: 'rgb(var(--color-neutral-800) / <alpha-value>)',
          900: 'rgb(var(--color-neutral-900) / <alpha-value>)',
          950: 'rgb(var(--color-neutral-950) / <alpha-value>)',
          DEFAULT: 'rgb(var(--color-neutral-500) / <alpha-value>)'
        },

        // Semantic colors
        success: {
          50: 'rgb(var(--color-success-50) / <alpha-value>)',
          100: 'rgb(var(--color-success-100) / <alpha-value>)',
          200: 'rgb(var(--color-success-200) / <alpha-value>)',
          300: 'rgb(var(--color-success-300) / <alpha-value>)',
          400: 'rgb(var(--color-success-400) / <alpha-value>)',
          500: 'rgb(var(--color-success-500) / <alpha-value>)',
          600: 'rgb(var(--color-success-600) / <alpha-value>)',
          700: 'rgb(var(--color-success-700) / <alpha-value>)',
          800: 'rgb(var(--color-success-800) / <alpha-value>)',
          900: 'rgb(var(--color-success-900) / <alpha-value>)',
          DEFAULT: 'rgb(var(--color-success-500) / <alpha-value>)'
        },
        
        warning: {
          50: 'rgb(var(--color-warning-50) / <alpha-value>)',
          100: 'rgb(var(--color-warning-100) / <alpha-value>)',
          200: 'rgb(var(--color-warning-200) / <alpha-value>)',
          300: 'rgb(var(--color-warning-300) / <alpha-value>)',
          400: 'rgb(var(--color-warning-400) / <alpha-value>)',
          500: 'rgb(var(--color-warning-500) / <alpha-value>)',
          600: 'rgb(var(--color-warning-600) / <alpha-value>)',
          700: 'rgb(var(--color-warning-700) / <alpha-value>)',
          800: 'rgb(var(--color-warning-800) / <alpha-value>)',
          900: 'rgb(var(--color-warning-900) / <alpha-value>)',
          DEFAULT: 'rgb(var(--color-warning-500) / <alpha-value>)'
        },
        
        error: {
          50: 'rgb(var(--color-error-50) / <alpha-value>)',
          100: 'rgb(var(--color-error-100) / <alpha-value>)',
          200: 'rgb(var(--color-error-200) / <alpha-value>)',
          300: 'rgb(var(--color-error-300) / <alpha-value>)',
          400: 'rgb(var(--color-error-400) / <alpha-value>)',
          500: 'rgb(var(--color-error-500) / <alpha-value>)',
          600: 'rgb(var(--color-error-600) / <alpha-value>)',
          700: 'rgb(var(--color-error-700) / <alpha-value>)',
          800: 'rgb(var(--color-error-800) / <alpha-value>)',
          900: 'rgb(var(--color-error-900) / <alpha-value>)',
          DEFAULT: 'rgb(var(--color-error-500) / <alpha-value>)'
        },
        
        info: {
          50: 'rgb(var(--color-info-50) / <alpha-value>)',
          100: 'rgb(var(--color-info-100) / <alpha-value>)',
          200: 'rgb(var(--color-info-200) / <alpha-value>)',
          300: 'rgb(var(--color-info-300) / <alpha-value>)',
          400: 'rgb(var(--color-info-400) / <alpha-value>)',
          500: 'rgb(var(--color-info-500) / <alpha-value>)',
          600: 'rgb(var(--color-info-600) / <alpha-value>)',
          700: 'rgb(var(--color-info-700) / <alpha-value>)',
          800: 'rgb(var(--color-info-800) / <alpha-value>)',
          900: 'rgb(var(--color-info-900) / <alpha-value>)',
          DEFAULT: 'rgb(var(--color-info-500) / <alpha-value>)'
        }
      },

      // ==================== SPACING ====================
      spacing: {
        'xs': 'var(--space-xs)',
        'sm': 'var(--space-sm)', 
        'md': 'var(--space-md)',
        'lg': 'var(--space-lg)',
        'xl': 'var(--space-xl)',
        '2xl': 'var(--space-2xl)',
        '3xl': 'var(--space-3xl)',
        '4xl': 'var(--space-4xl)'
      },

      // ==================== TYPOGRAPHY ====================
      fontSize: {
        'xs': ['var(--text-xs)', { lineHeight: '1.5' }],
        'sm': ['var(--text-sm)', { lineHeight: '1.5' }],
        'base': ['var(--text-base)', { lineHeight: '1.6' }],
        'lg': ['var(--text-lg)', { lineHeight: '1.6' }],
        'xl': ['var(--text-xl)', { lineHeight: '1.5' }],
        '2xl': ['var(--text-2xl)', { lineHeight: '1.4' }],
        '3xl': ['var(--text-3xl)', { lineHeight: '1.3' }],
        '4xl': ['var(--text-4xl)', { lineHeight: '1.2' }],
        '5xl': ['var(--text-5xl)', { lineHeight: '1.1' }],
        '6xl': ['var(--text-6xl)', { lineHeight: '1.0' }]
      },

      fontFamily: {
        'sans': ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace']
      },

      // ==================== BORDER RADIUS ====================
      borderRadius: {
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        '3xl': 'var(--radius-3xl)',
        'full': 'var(--radius-full)'
      },

      // ==================== SHADOWS ====================
      boxShadow: {
        'glass': 'var(--glass-shadow-light)',
        'glass-primary': 'var(--glass-shadow-primary)',
        'glass-secondary': 'var(--glass-shadow-secondary)',
        'glass-hover': '0 8px 32px rgba(31, 38, 135, 0.37), 0 0 0 1px rgba(255, 255, 255, 0.2)'
      },

      // ==================== BACKDROP BLUR ====================
      backdropBlur: {
        'xs': 'var(--glass-blur-sm)',
        'sm': 'var(--glass-blur-sm)',
        'md': 'var(--glass-blur-md)',
        'lg': 'var(--glass-blur-lg)',
        'xl': 'var(--glass-blur-xl)'
      },

      // ==================== TRANSITIONS ====================
      transitionDuration: {
        'fast': '150ms',
        'normal': '300ms',
        'slow': '500ms'
      },

      transitionTimingFunction: {
        'glass': 'cubic-bezier(0.4, 0, 0.2, 1)'
      },

      // ==================== ANIMATIONS ====================
      animation: {
        'glass-float': 'glass-float 6s ease-in-out infinite',
        'glass-pulse': 'glass-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient-shift': 'gradient-shift 3s ease infinite'
      },

      keyframes: {
        'glass-float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        'glass-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' }
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' }
        }
      },

      // ==================== GRADIENTS ====================
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-secondary-500)) 100%)',
        'gradient-primary': 'linear-gradient(135deg, rgb(var(--color-primary-400)) 0%, rgb(var(--color-primary-600)) 100%)',
        'gradient-secondary': 'linear-gradient(135deg, rgb(var(--color-secondary-400)) 0%, rgb(var(--color-secondary-600)) 100%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)'
      }
    }
  },

  plugins: [
    // Glassmorphism utilities plugin
    plugin(function({ addUtilities, addComponents, theme }) {
      
      // ==================== GLASS UTILITIES ====================
      addUtilities({
        '.glass': {
          background: 'var(--glass-bg-white)',
          backdropFilter: 'var(--glass-blur-md)',
          '-webkit-backdrop-filter': 'var(--glass-blur-md)',
          border: '1px solid var(--glass-border-white)',
          boxShadow: 'var(--glass-shadow-light)'
        },
        
        '.glass-primary': {
          background: 'var(--glass-bg-primary)',
          backdropFilter: 'var(--glass-blur-md)',
          '-webkit-backdrop-filter': 'var(--glass-blur-md)',
          border: '1px solid var(--glass-border-primary)',
          boxShadow: 'var(--glass-shadow-primary)'
        },
        
        '.glass-secondary': {
          background: 'var(--glass-bg-secondary)',
          backdropFilter: 'var(--glass-blur-md)',
          '-webkit-backdrop-filter': 'var(--glass-blur-md)',
          border: '1px solid var(--glass-border-secondary)',
          boxShadow: 'var(--glass-shadow-secondary)'
        },
        
        '.glass-black': {
          background: 'var(--glass-bg-black)',
          backdropFilter: 'var(--glass-blur-md)',
          '-webkit-backdrop-filter': 'var(--glass-blur-md)',
          border: '1px solid var(--glass-border-black)',
          boxShadow: 'var(--glass-shadow-light)'
        },

        // Glass hover effects
        '.glass-hover': {
          transition: 'var(--transition-normal)',
          '&:hover': {
            transform: 'scale(var(--scale-hover))',
            boxShadow: 'var(--glass-shadow-light), 0 0 0 1px var(--glass-border-white)'
          },
          '&:active': {
            transform: 'scale(var(--scale-press))'
          }
        },

        // Text gradients
        '.text-gradient-primary': {
          background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
          '-webkit-background-clip': 'text',
          'background-clip': 'text',
          '-webkit-text-fill-color': 'transparent'
        },
        
        '.text-gradient-secondary': {
          background: 'linear-gradient(135deg, rgb(var(--color-secondary-500)) 0%, rgb(var(--color-secondary-600)) 100%)',
          '-webkit-background-clip': 'text',
          'background-clip': 'text',
          '-webkit-text-fill-color': 'transparent'
        },
        
        '.text-gradient-brand': {
          background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-secondary-500)) 100%)',
          '-webkit-background-clip': 'text',
          'background-clip': 'text',
          '-webkit-text-fill-color': 'transparent'
        }
      });

      // ==================== GLASS COMPONENTS ====================
      addComponents({
        '.glass-card': {
          background: 'var(--glass-bg-white)',
          backdropFilter: 'var(--glass-blur-md)',
          '-webkit-backdrop-filter': 'var(--glass-blur-md)',
          border: '1px solid var(--glass-border-white)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--glass-shadow-light)',
          padding: 'var(--space-lg)',
          transition: 'var(--transition-normal)'
        },
        
        '.glass-button': {
          background: 'var(--glass-bg-white)',
          backdropFilter: 'var(--glass-blur-md)',
          '-webkit-backdrop-filter': 'var(--glass-blur-md)',
          border: '1px solid var(--glass-border-white)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--glass-shadow-light)',
          padding: 'var(--space-sm) var(--space-lg)',
          fontSize: 'var(--text-sm)',
          fontWeight: '500',
          transition: 'var(--transition-fast)',
          cursor: 'pointer',
          '&:hover': {
            transform: 'scale(1.02)',
            boxShadow: 'var(--glass-shadow-light), 0 0 0 1px var(--glass-border-white)'
          },
          '&:active': {
            transform: 'scale(0.98)'
          }
        },
        
        '.glass-navbar': {
          background: 'var(--glass-bg-white)',
          backdropFilter: 'var(--glass-blur-lg)',
          '-webkit-backdrop-filter': 'var(--glass-blur-lg)',
          border: '1px solid var(--glass-border-white)',
          borderRadius: 'var(--radius-2xl)',
          boxShadow: 'var(--glass-shadow-light)',
          padding: 'var(--space-md) var(--space-xl)'
        }
      });
    })
  ]
};