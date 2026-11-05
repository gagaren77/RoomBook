const colors = require('tailwindcss/colors');

// Navy ramp built around the college's #00205b (700) and #00143f (800);
// 100 is the site's theme color #d5e0eb.
const navy = {
  50: '#eef3fa',
  100: '#d5e0eb',
  200: '#b4c6dd',
  300: '#8aa5c8',
  400: '#4f78ae',
  500: '#1a4a8a',
  600: '#0f3a75',
  700: '#00205b',
  800: '#00143f',
  900: '#000f2e',
  950: '#000a1f',
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Midwestern Career College colors (mccollege.edu): navy nav and
        // headings, red accent, green and cyan buttons, blue links.
        navy,
        brand: {
          navy: '#00205b',
          'navy-deep': '#00143f',
          red: '#ce0f2c',
          green: '#51b66d',
          cyan: '#0ca7e1',
          link: '#0b6bbf',
        },
        // Every indigo/violet/blue class in the app now draws from the navy ramp
        indigo: navy,
        violet: navy,
        blue: navy,
        gray: colors.slate,
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px -4px rgba(15, 23, 42, 0.08)',
        'card-hover': '0 2px 4px rgba(15, 23, 42, 0.05), 0 12px 28px -8px rgba(0, 32, 91, 0.18)',
      },
    },
  },
  plugins: [],
};
