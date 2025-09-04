/**
 * W3 Suite Design Tokens
 * Main export for the design tokens package
 */

export { default as tailwindPreset } from './tailwind-preset.ts';

// WindTre Brand Colors (exported for programmatic use)
export const colors = {
  primary: {
    50: '#fff5eb',
    100: '#ffeadd', 
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#ff6900', // WindTre Orange
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
    950: '#431407'
  },
  
  secondary: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff', 
    300: '#d8b4fe',
    400: '#c48dfc',
    500: '#7b2cbf', // WindTre Purple
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
    950: '#2e1065'
  }
};

// Glassmorphism effects
export const glass = {
  backgrounds: {
    white: 'rgba(255, 255, 255, 0.85)',
    whiteLight: 'rgba(255, 255, 255, 0.6)',
    black: 'rgba(0, 0, 0, 0.85)',
    blackLight: 'rgba(0, 0, 0, 0.6)',
    primary: 'rgba(255, 105, 0, 0.15)',
    secondary: 'rgba(123, 44, 191, 0.15)'
  },
  
  borders: {
    white: 'rgba(255, 255, 255, 0.2)',
    black: 'rgba(0, 0, 0, 0.2)',
    primary: 'rgba(255, 105, 0, 0.3)',
    secondary: 'rgba(123, 44, 191, 0.3)'
  },
  
  blurs: {
    sm: 'blur(4px)',
    md: 'blur(8px)',
    lg: 'blur(16px)',
    xl: 'blur(24px)'
  }
};

// Spacing scale
export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px  
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
  '4xl': '6rem'    // 96px
};

// Typography scale
export const typography = {
  sizes: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
    '6xl': '3.75rem'  // 60px
  },
  
  families: {
    sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace']
  }
};

// Border radius scale
export const borderRadius = {
  sm: '0.375rem',  // 6px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  '2xl': '1.5rem', // 24px
  '3xl': '2rem',   // 32px
  full: '9999px'   // circle
};

// Animation timings
export const transitions = {
  fast: 'all 0.15s ease-in-out',
  normal: 'all 0.3s ease-in-out', 
  slow: 'all 0.5s ease-in-out'
};