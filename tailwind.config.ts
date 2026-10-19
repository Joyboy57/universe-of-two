import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        blush: "#F9E4E8",
        rose: "#E8A0B4",
        mauve: "#B07A9A",
        cream: "#FFF8F3",
        plum: "#3D2B3A",
        petal: "#FBEFF1",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        hand: ["var(--font-hand)", "cursive"],
      },
      borderRadius: { soft: "1.25rem", bloom: "2rem" },
      boxShadow: {
        soft: "0 10px 30px -12px rgba(176,122,154,0.35)",
      },
    },
  },
  plugins: [],
};
export default config;
