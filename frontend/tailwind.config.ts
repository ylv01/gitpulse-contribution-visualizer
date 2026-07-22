import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#050714",
        panel: "#0a0e20",
        cyan: "#28d7ff",
        violet: "#8b5cf6",
      },
      boxShadow: {
        neon: "0 0 28px rgba(40, 215, 255, 0.12)",
        violet: "0 0 28px rgba(139, 92, 246, 0.15)",
      },
      animation: {
        "pulse-slow": "pulse 3.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

