import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0d1b2a',
          soft: '#42546b',
          faint: '#7c8ba1',
        },
        aqua: {
          50: '#eef8fb',
          100: '#d3eef5',
          200: '#a7dcea',
          300: '#6ec3d9',
          400: '#33a3c2',
          500: '#1786a7',
          600: '#0d6b8a',
          700: '#0f566e',
          800: '#12475a',
          900: '#133c4c',
        },
        sand: '#f6f4f0',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(13,27,42,.06), 0 8px 24px -12px rgba(13,27,42,.18)',
      },
      maxWidth: {
        shell: '1200px',
      },
    },
  },
  plugins: [],
};

export default config;
