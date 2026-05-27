import type { Metadata } from 'next'
import { Noto_Sans_TC, Zen_Maru_Gothic, JetBrains_Mono } from 'next/font/google'
import './design-tokens.css'
import './globals.css'

const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-noto-sans-tc',
  display: 'swap',
})

const zenMaruGothic = Zen_Maru_Gothic({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-zen-maru-gothic',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: '芮選 · 商家後台',
  description: '代購賣家後台管理系統',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang='zh-TW'
      className={`${notoSansTC.variable} ${zenMaruGothic.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className='min-h-full flex flex-col' suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
