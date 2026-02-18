// Tailwind CSS Configuration for GePanda Theme
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'gp-bg': 'var(--gp-bg)',
        'gp-surface': 'var(--gp-surface)',
        'gp-primary': 'var(--gp-primary)',
        'gp-primary-dark': 'var(--gp-primary-dark)',
        'gp-text': 'var(--gp-text)',
        'gp-muted': 'var(--gp-muted)',
      },
    },
  },
  plugins: [],
};

export default config;
