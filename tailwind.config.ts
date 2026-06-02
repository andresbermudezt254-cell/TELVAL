import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        telval: {
          blue:   '#1e3a5f',
          orange: '#f97316',
          light:  '#f0f4f8',
        },
        status: {
          pending:   '#fef9c3',
          reviewing: '#dbeafe',
          approved:  '#dcfce7',
          buying:    '#ffedd5',
          completed: '#d1fae5',
          rejected:  '#fee2e2',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
