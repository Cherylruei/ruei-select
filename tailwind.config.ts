// tailwind.config.ts — 芮選 Design System
// 把 design-tokens.css 的 CSS 變數接成 Tailwind utility。
//
// 用法：
//   1. 把 design-tokens.css 放到 src/styles/（或你習慣的位置）
//   2. globals.css 第一行：@import "./styles/design-tokens.css";
//   3. 把這份合併到現有的 tailwind.config.ts 的 theme.extend 區段
//   4. 在 app/(admin)/layout.tsx 的 <body> 加 data-variant="forest"
//      在 app/(store)/layout.tsx 的 <body> 加 data-variant="candy"
//
// 之後你可以這樣寫：
//   <button className="bg-primary text-white rounded-pill px-5 h-10
//                       shadow-pink hover:bg-primary-hv font-display font-semibold">
//     確認下單
//   </button>

import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // ───── Colors ─────
      colors: {
        // Brand scales
        sakura: {
          50: 'var(--sakura-50)',
          100: 'var(--sakura-100)',
          200: 'var(--sakura-200)',
          300: 'var(--sakura-300)',
          400: 'var(--sakura-400)',
          500: 'var(--sakura-500)',
          600: 'var(--sakura-600)',
          700: 'var(--sakura-700)',
          800: 'var(--sakura-800)',
        },
        forest: {
          50: 'var(--forest-50)',
          100: 'var(--forest-100)',
          200: 'var(--forest-200)',
          300: 'var(--forest-300)',
          400: 'var(--forest-400)',
          500: 'var(--forest-500)',
          600: 'var(--forest-600)',
          700: 'var(--forest-700)',
          800: 'var(--forest-800)',
        },
        earth: {
          50: 'var(--earth-50)',
          100: 'var(--earth-100)',
          200: 'var(--earth-200)',
          300: 'var(--earth-300)',
          400: 'var(--earth-400)',
          500: 'var(--earth-500)',
          600: 'var(--earth-600)',
          700: 'var(--earth-700)',
        },
        ink: {
          50: 'var(--ink-50)',
          100: 'var(--ink-100)',
          200: 'var(--ink-200)',
          300: 'var(--ink-300)',
          400: 'var(--ink-400)',
          500: 'var(--ink-500)',
          600: 'var(--ink-600)',
          700: 'var(--ink-700)',
          800: 'var(--ink-800)',
          900: 'var(--ink-900)',
        },

        // Semantic — 隨 variant 自動換
        primary: {
          DEFAULT: 'var(--c-primary)',
          hv: 'var(--c-primary-hv)',
          bg: 'var(--c-primary-bg)',
          fg: 'var(--c-primary-fg)',
        },
        secondary: {
          DEFAULT: 'var(--c-secondary)',
          hv: 'var(--c-secondary-hv)',
          bg: 'var(--c-secondary-bg)',
          fg: 'var(--c-secondary-fg)',
        },
        accent: {
          DEFAULT: 'var(--c-accent)',
          bg: 'var(--c-accent-bg)',
        },

        // Surface / structural
        surface: 'var(--bg-surface)',
        sunken: 'var(--bg-sunken)',
        app: 'var(--bg-app)',

        // Foreground — use DEFAULT pattern: text-fg / text-fg-muted / text-fg-subtle
        fg: {
          DEFAULT: 'var(--fg-default)',
          muted: 'var(--fg-muted)',
          subtle: 'var(--fg-subtle)',
        },

        // Border — named 'line' to avoid border-border-* collision
        line: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
        },

        // Status
        success: { DEFAULT: 'var(--c-success)', bg: 'var(--c-success-bg)' },
        warning: { DEFAULT: 'var(--c-warning)', bg: 'var(--c-warning-bg)' },
        danger: { DEFAULT: 'var(--c-danger)', bg: 'var(--c-danger-bg)' },
        info: { DEFAULT: 'var(--c-info)', bg: 'var(--c-info-bg)' },
      },

      // ───── Border radius ─────
      borderRadius: {
        xs: 'var(--r-xs)',
        sm: 'var(--r-sm)',
        DEFAULT: 'var(--r-md)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
        '2xl': 'var(--r-2xl)',
        pill: 'var(--r-pill)',
      },

      // ───── Shadows ─────
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        pink: 'var(--shadow-pink)',
        green: 'var(--shadow-green)',
      },

      // ───── Typography ─────
      fontFamily: {
        display: ['"Zen Maru Gothic"', '"Noto Sans TC"', 'system-ui', 'sans-serif'],
        body: ['"Noto Sans TC"', '"Zen Maru Gothic"', 'system-ui', 'sans-serif'],
        sans: ['"Noto Sans TC"', '"Zen Maru Gothic"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Menlo"', 'monospace'],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '1.55' }],
        sm: ['13px', { lineHeight: '1.55' }],
        base: ['14px', { lineHeight: '1.55' }],
        md: ['16px', { lineHeight: '1.55' }],
        lg: ['18px', { lineHeight: '1.55' }],
        xl: ['22px', { lineHeight: '1.35' }],
        '2xl': ['28px', { lineHeight: '1.35' }],
        '3xl': ['36px', { lineHeight: '1.2' }],
        '4xl': ['48px', { lineHeight: '1.1' }],
        '5xl': ['64px', { lineHeight: '1.05' }],
      },

      // ───── Motion ─────
      transitionTimingFunction: {
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      transitionDuration: {
        fast: '120ms',
        DEFAULT: '200ms',
        slow: '320ms',
      },
    },
  },
  plugins: [],
}

export default config
