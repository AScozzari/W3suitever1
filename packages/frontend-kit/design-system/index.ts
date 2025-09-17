// Export all design system files
export * from './index.css';

// Re-export design system CSS as a string for bundlers
export const designSystemCSS = `
  @import './tokens.css';
  @import './glassmorphism.css';
  @import './animations.css';
`;