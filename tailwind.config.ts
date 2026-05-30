import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "hsl(var(--bg))",
        "bg-subtle": "hsl(var(--bg-subtle))",
        fg: "hsl(var(--fg))",
        "fg-muted": "hsl(var(--fg-muted))",
        borde: "hsl(var(--border))",
        accent: "hsl(var(--accent))",
        "accent-fg": "hsl(var(--accent-fg))",
      },
      fontFamily: {
        sans: ["var(--font-geist)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
