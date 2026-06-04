import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Care palette — warm-clinical (caregiver M2+)
        care: {
          bg:              '#f3ece2',
          surface:         '#fdfaf6',
          raised:          '#ffffff',
          primary:         '#3d7a6e',
          'primary-light': '#e8f2f0',
          'primary-hover': '#2f6159',
          accent:          '#7a9e94',
          'accent-light':  '#eef4f2',
          text:            '#1c1917',
          'text-muted':    '#6b6561',
          'text-subtle':   '#a8a099',
          border:          '#e8dfd4',
          'border-subtle': '#f0e8df',
          highlight:       '#f5ede3',
          sage:            '#b3cdc6',
          'sage-light':    '#f0f5f3',
        },
        // Patient-side warm palette
        patient: {
          blue:          '#5b8def',
          green:         '#5cb89a',
          cream:         '#fbf7f0',
          text:          '#2b2b3a',
          'blue-light':  '#e8f0fd',
          'green-light': '#e5f5f0',
          'warm-orange': '#f0a05a',
          'warm-yellow': '#f5d76e',
        },
        // Legacy caregiver tokens — M1 pages
        caregiver: {
          primary:   '#4f7fe8',
          secondary: '#64748b',
          surface:   '#fdfaf6',
          border:    '#e8dfd4',
          text:      '#0f172a',
          muted:     '#64748b',
        },
      },
      fontFamily: {
        sans:    ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
      },
      fontSize: {
        'patient-body': ['22px', { lineHeight: '1.6' }],
        'patient-lg':   ['28px', { lineHeight: '1.4' }],
        'patient-xl':   ['36px', { lineHeight: '1.3' }],
        'patient-2xl':  ['48px', { lineHeight: '1.2' }],
      },
      minHeight: { touch: '64px' },
      minWidth:  { touch: '64px' },
      borderRadius: {
        patient:    '20px',
        'patient-lg': '28px',
        care:       '14px',
        'care-lg':  '20px',
        'care-xl':  '28px',
      },
      boxShadow: {
        'care-sm': '0 1px 2px rgba(28,25,23,0.04), 0 2px 6px rgba(28,25,23,0.04)',
        'care':    '0 2px 8px rgba(28,25,23,0.05), 0 6px 20px rgba(28,25,23,0.06)',
        'care-lg': '0 4px 16px rgba(28,25,23,0.07), 0 16px 40px rgba(28,25,23,0.08)',
        'care-xl': '0 8px 24px rgba(28,25,23,0.08), 0 24px 60px rgba(28,25,23,0.10)',
      },
    },
  },
  plugins: [],
};

export default config;
