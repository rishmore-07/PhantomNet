/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        soc: {
          bg: '#090D14',
          sidebar: '#0D121B',
          card: '#111824',
          elevated: '#172131',
          border: '#263244',
          borderLight: '#334155',
          cyan: '#38BDF8',
          text: '#F1F5F9',
          textMuted: '#94A3B8',
          textDim: '#64748B',
          green: '#34D399',
          amber: '#FBBF24',
          red: '#F87171',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'Menlo', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 1px 0 rgba(255,255,255,0.03)',
      },
    },
  },
  plugins: [],
};
