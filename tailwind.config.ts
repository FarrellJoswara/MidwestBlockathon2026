import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        ink: {
          50: "#f6f5f2",
          100: "#e8e6e0",
          200: "#d4d0c6",
          300: "#b5aea0",
          400: "#918a7a",
          500: "#756e60",
          600: "#5f5950",
          700: "#4e4942",
          800: "#433f39",
          900: "#3b3833",
          950: "#1f1d1b",
        },
        parchment: "#faf8f4",
        seal: "#8b3a3a",
        gold: "#c9a227",
      },
    },
  },
  plugins: [],
};

export default config;
