/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0B0F19',
          800: '#0F1424',
          700: '#141A2E',
          600: '#1B2238',
          500: '#252E48',
          400: '#3A466A',
          300: '#6B7A9F',
          200: '#9CA8C7',
          100: '#D7DEEF',
        },
        brand: {
          pink: '#FF2A85',
          orange: '#FF8A00',
          yellow: '#FFC700',
          cyan: '#00C2FF',
        },
        success: '#22D3A6',
        warning: '#FFC700',
        error: '#FF4D6D',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #FF2A85 0%, #FF8A00 40%, #FFC700 70%, #00C2FF 100%)',
        'brand-soft': 'linear-gradient(135deg, rgba(255,42,133,0.18), rgba(255,138,0,0.12), rgba(0,194,255,0.18))',
        'grid-glow': 'radial-gradient(circle at 20% 10%, rgba(255,42,133,0.10), transparent 45%), radial-gradient(circle at 80% 30%, rgba(0,194,255,0.10), transparent 45%), radial-gradient(circle at 50% 90%, rgba(255,138,0,0.08), transparent 50%)',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0,0,0,0.37)',
        glow: '0 0 24px rgba(255,42,133,0.35), 0 0 48px rgba(0,194,255,0.18)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 12px rgba(255,42,133,0.35)' },
          '50%': { boxShadow: '0 0 28px rgba(255,42,133,0.6), 0 0 42px rgba(0,194,255,0.25)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
        pulseGlow: 'pulseGlow 3s ease-in-out infinite',
        blink: 'blink 1.1s step-end infinite',
      },
    },
  },
  plugins: [],
};
