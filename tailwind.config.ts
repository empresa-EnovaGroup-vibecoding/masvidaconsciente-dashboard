import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "hsl(var(--bg) / <alpha-value>)",
        "bg-subtle": "hsl(var(--bg-subtle) / <alpha-value>)",
        fg: "hsl(var(--fg) / <alpha-value>)",
        "fg-muted": "hsl(var(--fg-muted) / <alpha-value>)",
        "fg-faint": "hsl(var(--fg-faint) / <alpha-value>)",
        borde: "hsl(var(--border) / <alpha-value>)",
        accent: "hsl(var(--accent) / <alpha-value>)",
        "accent-soft": "hsl(var(--accent-soft) / <alpha-value>)",
        "accent-fg": "hsl(var(--accent-fg) / <alpha-value>)",
        warn: "hsl(var(--warn) / <alpha-value>)",
        "warn-bg": "hsl(var(--warn-bg) / <alpha-value>)",
        "warn-border": "hsl(var(--warn-border) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-nunito)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 1.5px rgba(20,40,30,0.035), 0 10px 30px -22px rgba(20,40,30,0.16)",
        "card-hover": "0 1px 2px rgba(20,40,30,0.04), 0 18px 40px -24px rgba(20,40,30,0.22)",
        soft: "0 1px 1px rgba(20,40,30,0.04)",
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
