import type { Config } from "tailwindcss";
import preset from "../../../packages/tokens/tailwind-preset";

const config: Config = {
  presets: [preset],
  content: [
    "./src/**/*.{ts,tsx,jsx,js}",
    "./index.html",
    "../../../packages/ui/src/**/*.{ts,tsx,jsx,js}",
  ],
  darkMode: ["class"],
  safelist: [
    'min-h-screen',
    'flex',
    'items-center',
    'justify-center',
    'backdrop-blur-sm',
    'bg-white',
    'bg-opacity-10',
    'rounded-lg',
    'p-4',
    'p-8',
    'space-y-6',
    'text-white',
    'text-sm',
    'text-2xl',
    'font-bold',
    'font-medium',
    'w-full',
    'max-w-md',
    'relative',
    'absolute',
    'inset-0',
    'opacity-10',
    'shadow-2xl',
    'transition-all',
    'duration-200',
    'hover:bg-opacity-[0.15]',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-orange-500',
    'disabled:opacity-50'
  ],
};

export default config;