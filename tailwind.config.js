/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: '#e5e7eb',
        background: 'var(--color-background, #f9fafb)',
        foreground: 'var(--color-foreground, #111827)',
        primary: {
          50: 'var(--color-primary-50, #eff6ff)',
          100: 'var(--color-primary-100, #dbeafe)',
          200: 'var(--color-primary-200, #bfdbfe)',
          300: 'var(--color-primary-300, #93c5fd)',
          400: 'var(--color-primary-400, #60a5fa)',
          500: 'var(--color-primary-500, #3b82f6)',
          600: 'var(--color-primary-600, #2563eb)',
          700: 'var(--color-primary-700, #1d4ed8)',
          800: 'var(--color-primary-800, #1e40af)',
          900: 'var(--color-primary-900, #1e3a8a)',
        },
        accent: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',

        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        h1: ['2.25rem', { lineHeight: '2.5rem', fontWeight: '700' }],
        h2: ['1.875rem', { lineHeight: '2.25rem', fontWeight: '600' }],
        h3: ['1.5rem', { lineHeight: '2rem', fontWeight: '600' }],
        h4: ['1.25rem', { lineHeight: '1.75rem', fontWeight: '500' }],
        subtitle: ['1rem', { lineHeight: '1.5rem', fontWeight: '500' }],
        caption: ['0.75rem', { lineHeight: '1rem' }],
      },
      spacing: {
        13: '3.25rem',
        15: '3.75rem',
        18: '4.5rem',
        22: '5.5rem',
        26: '6.5rem',
      },
    },
  },
  plugins: [],
}

