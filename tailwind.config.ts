import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ijebu: {
          primary: "#1E3A8A",
          gold: "#D4AF37",
          cream: "#F8F5F0",
          coral: "#FF6B6B",
          dark: "#0A0A0A",
        },
      },
    },
  },
  plugins: [],
};

export default config;