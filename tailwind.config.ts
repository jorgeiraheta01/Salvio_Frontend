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
      fontFamily: {
        sans: ["var(--font-manrope)", "Manrope", "sans-serif"]
      },
      colors: {
        // Design system "Clinical Precision" — ver stitch_visual_interface_refinement/DESIGN.md
        brand: {
          DEFAULT: "#0d9488",
          light: "#f0fdfa"
        },
        surface: {
          DEFAULT: "#f8f9ff",
          dim: "#cbdbf5",
          bright: "#f8f9ff",
          lowest: "#ffffff",
          low: "#eff4ff"
        },
        border: "#e2e8f0",
        input: "#e2e8f0",
        ring: "#0d9488",
        background: "#f8f9ff",
        foreground: "#0f172a",
        primary: {
          DEFAULT: "#0d9488",
          foreground: "#ffffff"
        },
        secondary: {
          DEFAULT: "#475569",
          foreground: "#ffffff"
        },
        muted: {
          DEFAULT: "#f8fafc",
          foreground: "#64748b"
        },
        accent: {
          DEFAULT: "#f59e0b",
          foreground: "#0f172a"
        },
        card: {
          DEFAULT: "#ffffff",
          foreground: "#0f172a"
        },
        destructive: {
          DEFAULT: "#ba1a1a",
          foreground: "#ffffff"
        },
        success: {
          DEFAULT: "#0d9488",
          foreground: "#0f172a"
        }
      },
      borderRadius: {
        custom: "8px",
        lg: "1rem",
        md: "0.5rem",
        sm: "0.25rem"
      },
      boxShadow: {
        panel: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)"
      }
    }
  },
  plugins: [forms]
};

export default config;
