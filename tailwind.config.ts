import { type Config } from "tailwindcss";
import { createThemes } from "@/lib/themes";

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["'DM Serif Display'", "serif"],
        body: ["'Inter'", "sans-serif"],
      },
      colors: createThemes(),
    },
  },
  plugins: [],
} satisfies Config;