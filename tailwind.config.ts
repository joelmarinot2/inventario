import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "900px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Semáforo de inventario.
        ok: {
          DEFAULT: "hsl(var(--ok))",
          foreground: "hsl(var(--ok-foreground))",
        },
        warn: {
          DEFAULT: "hsl(var(--warn))",
          foreground: "hsl(var(--warn-foreground))",
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          foreground: "hsl(var(--danger-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontSize: {
        // Escala accesible: base grande para persona mayor. El tracking se
        // aprieta a medida que el tamaño crece (estilo Emil Kowalski).
        sm: ["1rem", { lineHeight: "1.5", letterSpacing: "0.005em" }], // 16px
        base: ["1.25rem", { lineHeight: "1.6", letterSpacing: "0em" }], // 20px
        lg: ["1.5rem", { lineHeight: "1.45", letterSpacing: "-0.01em" }], // 24px
        xl: ["1.75rem", { lineHeight: "1.35", letterSpacing: "-0.015em" }], // 28px
        "2xl": ["2rem", { lineHeight: "1.25", letterSpacing: "-0.02em" }], // 32px
        "3xl": ["2.5rem", { lineHeight: "1.12", letterSpacing: "-0.022em" }], // 40px
        "4xl": ["3rem", { lineHeight: "1.05", letterSpacing: "-0.025em" }], // 48px
        "5xl": ["3.75rem", { lineHeight: "1", letterSpacing: "-0.03em" }], // 60px
      },
      transitionTimingFunction: {
        // Curvas de Emil: ease-out fuerte para UI, in-out para morphing.
        "out-strong": "cubic-bezier(0.23, 1, 0.32, 1)",
        "in-out-strong": "cubic-bezier(0.77, 0, 0.175, 1)",
      },
      boxShadow: {
        // Sombras semitransparentes y en capas (nunca sólidas).
        card: "0 1px 2px rgba(16, 24, 40, 0.04)",
        float:
          "0 8px 24px rgba(16, 24, 40, 0.10), 0 2px 6px rgba(16, 24, 40, 0.06)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
