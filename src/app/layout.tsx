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

export async function generateMetadata(): Promise<Metadata> {
  const { getAppConfig } = await import('@/lib/config')
  const config = await getAppConfig()

  const title = `${config.festivalName} | GTPC Cherthala`
  const description = `The official digital platform for the ${config.festivalName} ${config.festivalYear} at Government Polytechnic College Cherthala.`
  const icon = config.appFavicon || '/favicon.png'

  return {
    title,
    description,
    keywords: ['ArtsFest', 'GPTC Cherthala', 'Arts Festival', 'Polytechnic', 'Kerala Culture', 'Student Competition', 'Program Registration'],
    authors: [{ name: 'GPTC Cherthala' }],
    manifest: '/manifest.json',
    other: {
      'mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-capable': 'yes',
    },
    icons: {
      icon: icon,
      apple: icon,
    },
    openGraph: {
      title,
      description,
      url: 'https://artsfest-gptc.vercel.app',
      siteName: config.festivalName,
      images: [{ url: icon }],
      locale: 'en_IN',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [icon],
    },
  }
}

export const viewport = {
  themeColor: '#8B0000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
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