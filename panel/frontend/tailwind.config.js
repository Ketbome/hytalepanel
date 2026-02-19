/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  theme: {
    extend: {
      colors: {
        // Hytale Brand Colors
        hytale: {
          orange: "#e8a93c",
          gold: "#d4a534",
          cream: "#f5e6c8",
        },
        // Minecraft Earth Tones
        dirt: {
          light: "#9b7653",
          DEFAULT: "#7a5c3e",
          dark: "#5c4530",
        },
        grass: {
          light: "#7bb342",
          DEFAULT: "#5d8731",
          dark: "#486b26",
        },
        stone: {
          light: "#8a8a8a",
          DEFAULT: "#6a6a6a",
          dark: "#4a4a4a",
        },
        wood: {
          light: "#b8956a",
          DEFAULT: "#8b6b4a",
          dark: "#6b4f36",
        },
        // Panel Colors
        panel: {
          bg: "#2a2018",
          light: "#3d3027",
          lighter: "#4d3f33",
          border: "#5a4a3a",
          "border-light": "#6d5a48",
        },
        // Semantic Colors
        success: "#5d8731",
        warning: "#d4a534",
        error: "#a83232",
        info: "#4a7c9b",
        // Text
        text: {
          DEFAULT: "#f5e6c8",
          muted: "#b8a68a",
          dim: "#8a7a64",
        },
      },
      fontFamily: {
        display: ['"Press Start 2P"', "monospace"],
        mono: ['"VT323"', "monospace"],
        code: ['"JetBrains Mono"', "monospace"],
        uk: ['"8bit Operator"', "monospace"],
      },
      boxShadow: {
        "mc-btn":
          "inset -2px -4px 0 rgba(0,0,0,0.4), inset 2px 2px 0 rgba(255,255,255,0.15)",
        "mc-btn-pressed":
          "inset 2px 4px 0 rgba(0,0,0,0.4), inset -2px -2px 0 rgba(255,255,255,0.1)",
        "mc-panel":
          "inset 0 0 0 2px rgba(0,0,0,0.3), inset 0 0 0 4px rgba(255,255,255,0.05)",
        pixel: "4px 4px 0 rgba(0,0,0,0.5)",
        "pixel-sm": "2px 2px 0 rgba(0,0,0,0.5)",
      },
      backgroundImage: {
        "dirt-texture":
          "url(\"data:image/svg+xml,%3Csvg width='8' height='8' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='8' height='8' fill='%237a5c3e'/%3E%3Crect x='0' y='0' width='2' height='2' fill='%236b4f36' opacity='0.5'/%3E%3Crect x='4' y='2' width='2' height='2' fill='%238b6b4a' opacity='0.3'/%3E%3Crect x='2' y='4' width='2' height='2' fill='%236b4f36' opacity='0.4'/%3E%3Crect x='6' y='6' width='2' height='2' fill='%238b6b4a' opacity='0.3'/%3E%3C/svg%3E\")",
        "stone-texture":
          "url(\"data:image/svg+xml,%3Csvg width='8' height='8' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='8' height='8' fill='%234a4a4a'/%3E%3Crect x='0' y='0' width='2' height='2' fill='%233a3a3a' opacity='0.5'/%3E%3Crect x='4' y='2' width='2' height='2' fill='%235a5a5a' opacity='0.3'/%3E%3Crect x='2' y='4' width='2' height='2' fill='%233a3a3a' opacity='0.4'/%3E%3Crect x='6' y='6' width='2' height='2' fill='%235a5a5a' opacity='0.3'/%3E%3C/svg%3E\")",
        "grass-gradient":
          "linear-gradient(180deg, #7bb342 0%, #5d8731 40%, #7a5c3e 40%, #5c4530 100%)",
      },
      keyframes: {
        spin: {
          to: { transform: "rotate(360deg)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(8px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "slide-down": {
          from: { transform: "translateY(-8px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "bounce-in": {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "50%": { transform: "scale(1.02)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
      animation: {
        spin: "spin 0.8s linear infinite",
        "fade-in": "fade-in 0.2s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "slide-down": "slide-down 0.3s ease-out",
        "bounce-in": "bounce-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        pulse: "pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
