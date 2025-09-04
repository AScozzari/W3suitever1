import type { Config } from "tailwindcss";
import preset from "../../packages/tokens/tailwind-preset.ts";

const config: Config = {
  presets: [preset],
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ["class"],
};

export default config;