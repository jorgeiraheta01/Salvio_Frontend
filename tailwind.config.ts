import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
    "./src/modules/**/*.{ts,tsx}",
    "./src/shared/**/*.{ts,tsx}",
    "./src/core/**/*.{ts,tsx}"
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1400px"
      }
    },
    extend: {
      colors: {
        border: "hsl(214 20% 84%)",
        input: "hsl(214 20% 84%)",
        ring: "hsl(167 73% 33%)",
        background: "hsl(210 40% 98%)",
        foreground: "hsl(222 47% 11%)",
        primary: {
          DEFAULT: "hsl(167 73% 33%)",
          foreground: "hsl(0 0% 100%)"
        },
        secondary: {
          DEFAULT: "hsl(355 78% 58%)",
          foreground: "hsl(0 0% 100%)"
        },
        muted: {
          DEFAULT: "hsl(210 32% 94%)",
          foreground: "hsl(215 16% 35%)"
        },
        accent: {
          DEFAULT: "hsl(44 92% 53%)",
          foreground: "hsl(222 47% 11%)"
        },
        card: {
          DEFAULT: "hsl(0 0% 100%)",
          foreground: "hsl(222 47% 11%)"
        },
        destructive: {
          DEFAULT: "hsl(0 72% 51%)",
          foreground: "hsl(0 0% 100%)"
        }
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem"
      },
      boxShadow: {
        panel: "0 18px 40px -24px rgba(15, 23, 42, 0.35)"
      }
    }
  },
  plugins: [forms]
};

export default config;
