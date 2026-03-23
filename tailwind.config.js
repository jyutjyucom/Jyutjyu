/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // 使用 class 策略启用暗黑模式
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
    './error.vue'
  ],
  theme: {
    extend: {
      colors: {
        // Scholar's Ink (Kapok Edition) design system
        kapok: {
          DEFAULT: '#b53a25',
          container: '#f8e7e4'
        },
        ink: '#031632',
        parchment: '#fbf9f4',
        graphite: '#44474d',
        'archive-green': {
          DEFAULT: '#4A6B5D',
          light: '#7FA393'
        },
        'muted-gold': '#725b35',
        'surface-low': '#f5f2ed',
        'surface-mid': '#f0eee9',
        'surface-high': '#eae8e3',
        'surface-highest': '#e4e2dd',
        'outline-soft': '#c5c6ce'
      },
      fontFamily: {
        sans: [
          '"Inter Variable"',
          'sans-serif'
        ],
        'cjk-sans': [
          '"Inter Variable"',
          '"Chiron Hei HK Variable"',
          'sans-serif'
        ],
        'cjk-serif': [
          '"Chiron Sung HK Variable"',
          'serif'
        ],
        serif: [
          '"Chiron Sung HK Variable"',
          'serif'
        ],
        headline: [
          '"Chiron Sung HK Variable"',
          'serif'
        ],
        // 粤拼字体
        mono: [
          'Consolas',
          'Monaco',
          'Courier New',
          'monospace'
        ]
      },
      fontSize: {
        // 自定义字号，适合中文阅读
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.75rem' }],
        'lg': ['1.125rem', { lineHeight: '1.875rem' }],
        'xl': ['1.25rem', { lineHeight: '2rem' }],
        '2xl': ['1.5rem', { lineHeight: '2.25rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.5rem' }]
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem'
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in',
        'slide-up': 'slideUp 0.3s ease-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      }
    }
  },
  plugins: []
}
