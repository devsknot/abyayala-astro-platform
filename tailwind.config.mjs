/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Colores principales basados en el logo CAAY
        'primary': {
          DEFAULT: '#1A5B92', // Azul profundo del logo
          'dark': '#0F4A7B',
          'light': '#3A7DB2',
        },
        'secondary': {
          DEFAULT: '#4C9F70', // Verde tierra
          'dark': '#3B8A5E',
          'light': '#6DB58E',
        },
        'accent': {
          DEFAULT: '#E6A33E', // Dorado/ocre
          'dark': '#D18C28',
          'light': '#F1BB6A',
        },
        // Neutros
        'background': '#FAFBFC',
        'bg-alt': '#F0F4F8',
        'text': {
          DEFAULT: '#2D3748',
          'secondary': '#4A5568',
          'tertiary': '#718096',
        },
        'border': {
          DEFAULT: '#E2E8F0',
          'dark': '#CBD5E0',
        },
      },
      fontFamily: {
        'title': ['var(--font-title)', 'sans-serif'],
        'body': ['var(--font-body)', 'sans-serif'],
        'accent': ['var(--font-accent)', 'serif'],
      },
    },
  },
  plugins: [],
}
