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
        // Look "Sereno": sombras más suaves, difusas y ligeras (neutras, no verdes).
        card: "0 1px 2px rgba(16,24,40,0.03), 0 10px 30px -14px rgba(16,24,40,0.10)",
        "card-hover": "0 2px 4px rgba(16,24,40,0.04), 0 22px 48px -20px rgba(16,24,40,0.14)",
        soft: "0 1px 2px rgba(16,24,40,0.035)",
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
