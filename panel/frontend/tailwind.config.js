/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  theme: {
    extend: {
      colors: {
        "hytale-orange": "#f5a623",
        "hytale-yellow": "#ffd93d",
        "hytale-cyan": "#4ecdc4",
        "mc-green": "#5d8731",
        "mc-green-light": "#7cb342",
        "mc-dark": "#1a1a1a",
        "mc-darker": "#0f0f0f",
        "mc-panel": "#2d2d2d",
        "mc-panel-light": "#3d3d3d",
        "mc-border-light": "#4a4a4a",
        text: "#ffffff",
        "text-dim": "#a0a0a0",
      },
      fontFamily: {
        display: ['"Press Start 2P"', "monospace"],
        mono: ['"VT323"', "monospace"],
        code: ['"JetBrains Mono"', "monospace"],
        uk: ['"8bit Operator"', "monospace"],
      },
      keyframes: {
        spin: {
          to: { transform: "rotate(360deg)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "slide-in": {
          from: {
            transform: "translateY(-0.5rem)",
            opacity: "0",
          },
          to: {
            transform: "translateY(0)",
            opacity: "1",
          },
        },
        "slide-out": {
          from: {
            transform: "translateY(0)",
            opacity: "1",
          },
          to: {
            transform: "translateY(0.5rem)",
            opacity: "0",
          },
        },
        glitch: {
          "0%, 100%": { transform: "translate(0)" },
          "33%": { transform: "translate(-2px, 2px)" },
          "66%": { transform: "translate(2px, -2px)" },
        },
        pixelate: {
          "0%": { filter: "blur(4px)", opacity: "0" },
          "100%": { filter: "blur(0)", opacity: "1" },
        },
      },
      animation: {
        spin: "spin 0.8s linear infinite",
        "fade-in": "fade-in 0.2s ease-out",
        "fade-out": "fade-out 0.2s ease-in",
        "slide-in": "slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-out": "slide-out 0.2s ease-in",
        glitch: "glitch 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both",
        pixelate: "pixelate 0.3s steps(8) both",
      },
    },
  },
  plugins: [],
};
