import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}"
  ],

  theme: {
    extend: {
      colors: {
        primary: "#0f172a",
        secondary: "#1e293b",

        success: "#22c55e",
        warning: "#f59e0b",
        danger: "#ef4444",

        muted: "#64748b",
        border: "#e2e8f0",

        bg: "#f8fafc"
      },

      borderRadius: {
        xl: "16px",
        "2xl": "20px"
      },

      boxShadow: {
        card: "0 4px 12px rgba(0,0,0,0.05)",
        strong: "0 10px 25px rgba(0,0,0,0.1)"
      }
    }
  },

  plugins: []
};

export default config;
