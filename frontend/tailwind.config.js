/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        stark: {
          cyan: "#00F0FF",
          cyanGlow: "rgba(0, 240, 255, 0.4)",
          gold: "#FFB800",
          goldGlow: "rgba(255, 184, 0, 0.4)",
          red: "#FF2A55",
          dark: "#050B14",
          panel: "rgba(6, 18, 36, 0.7)",
          border: "rgba(0, 240, 255, 0.25)"
        },
        lens: {
          bg: "#050B14",
          card: "#0A1628",
          accent: "#00F0FF",
          warning: "#FFB800",
          success: "#00FF9D"
        }
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      animation: {
        'spin-slow': 'spin 12s linear infinite',
        'spin-reverse': 'spin-reverse 16s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'radar-sweep': 'radarSweep 3s linear infinite',
        'hologram': 'hologram 4s ease infinite',
      },
      keyframes: {
        'spin-reverse': {
          '0%': { transform: 'rotate(360deg)' },
          '100%': { transform: 'rotate(0deg)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.9', filter: 'drop-shadow(0 0 8px rgba(0,240,255,0.6))' },
          '50%': { opacity: '0.4', filter: 'drop-shadow(0 0 2px rgba(0,240,255,0.2))' },
        },
        radarSweep: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' }
        }
      }
    },
  },
  plugins: [],
}
