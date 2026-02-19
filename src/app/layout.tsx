import type { Metadata } from 'next'
import { inter } from '@/lib/fonts'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ContactFloat from '@/components/ContactFloat'
import NotificationManager from '@/components/NotificationManager'
import './globals.css'
import { ConfigProvider } from '@/context/ConfigContext'
import { ModalProvider } from '@/context/ModalContext'
import { LoadingProvider } from '@/context/LoadingContext'

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
      url: 'https://artsfestgptcctla.vercel.app',
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
    verification: {
      google: '2a2b2787f7d55980',
    },
    alternates: {
      canonical: 'https://artsfestgptcctla.vercel.app',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  }
}

export const viewport = {
  themeColor: '#8B0000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { getAppConfig } = await import('@/lib/config')
  const config = await getAppConfig()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: config.festivalName,
    startDate: `${config.festivalYear}-01-01`, // Rough start date for schema
    location: {
      '@type': 'Place',
      name: 'Government Polytechnic College Cherthala',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Cherthala',
        addressRegion: 'Kerala',
        addressCountry: 'IN',
      },
    },
    image: config.appFavicon || '/favicon.png',
    description: `The official digital platform for the ${config.festivalName} at GPTC Cherthala.`,
    organizer: {
      '@type': 'Organization',
      name: 'GPTC Cherthala',
      url: 'https://artsfestgptcctla.vercel.app',
    },
  }

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={inter.className}>
        <ConfigProvider>
          <LoadingProvider>
            <ModalProvider>
              <Navbar />
              {children}
              <Footer />
              <ContactFloat />
              <NotificationManager />
            </ModalProvider>
          </LoadingProvider>
        </ConfigProvider>
      </body>
    </html>
  )
}