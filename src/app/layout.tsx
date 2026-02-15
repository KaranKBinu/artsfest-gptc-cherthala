import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ContactFloat from '@/components/ContactFloat'
import './globals.css'
import { ConfigProvider } from '@/context/ConfigContext'
import { ModalProvider } from '@/context/ModalContext'
import { LoadingProvider } from '@/context/LoadingContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ArtsFest | GPTC Cherthala Arts Program',
  description: 'The official digital platform for the Arts Festival at Government Polytechnic College Cherthala. Register for events, track house scores, and celebrate cultural heritage.',
  keywords: ['ArtsFest', 'GPTC Cherthala', 'Arts Festival', 'Polytechnic', 'Kerala Culture', 'Student Competition', 'Program Registration'],
  authors: [{ name: 'GPTC Cherthala' }],
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title: 'ArtsFest | GPTC Cherthala',
    description: 'Celebrating Culture & Creativity at GPTC Cherthala Arts Festival.',
    url: 'https://artsfest-gptc.vercel.app', // Placeholder or actual URL if known
    siteName: 'ArtsFest GPTC',
    images: [
      {
        url: '/favicon.png',
        width: 512,
        height: 512,
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ArtsFest | GPTC Cherthala',
    description: 'Official portal for GPTC Cherthala Arts Festival.',
    images: ['/favicon.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ConfigProvider>
          <LoadingProvider>
            <ModalProvider>
              <Navbar />
              {children}
              <Footer />
              <ContactFloat />
            </ModalProvider>
          </LoadingProvider>
        </ConfigProvider>
      </body>
    </html>
  )
}