import type { Config } from "tailwindcss";
import preset from "@tokens/tailwind-preset";

const config: Config = {
  presets: [preset],
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./index.html",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: ["class"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
  },
  plugins: [],
};

export default config;