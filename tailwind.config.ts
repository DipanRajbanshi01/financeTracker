import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Orbit Ledger brand: dark base + neon accents (matches thesyntaxorbit.com vibe)
        orbit: {
          bg: "#05070d",
          surface: "#0b1020",
          border: "#1a2240",
          muted: "#8b93b5",
          text: "#e6e9f5",
          cyan: "#22d3ee",
          magenta: "#e879f9",
          lime: "#a3e635",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "Inter", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        neon: "0 0 0 1px rgba(34,211,238,0.4), 0 0 24px -4px rgba(34,211,238,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
