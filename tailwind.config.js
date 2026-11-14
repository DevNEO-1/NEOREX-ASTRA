/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#030712',
          900: '#0a0f1d',
          850: '#0f172a',
          800: '#111827',
          700: '#1e293b',
          600: '#334155',
        },
        cyan: {
          glow: '#00f2fe',
        },
        mars: {
          rust: '#e0533c',
          amber: '#f59e0b',
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 15px -3px rgba(6, 182, 212, 0.4)',
        'glow-emerald': '0 0 15px -3px rgba(16, 185, 129, 0.4)',
        'glow-amber': '0 0 15px -3px rgba(245, 158, 11, 0.4)',
        'glow-red': '0 0 15px -3px rgba(239, 68, 68, 0.4)',
      }
    },
  },
  plugins: [],
}
