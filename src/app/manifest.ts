import { MetadataRoute } from 'next'
import { getAppConfig } from '@/lib/config'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
    const config = await getAppConfig()

    return {
        name: config.festivalName,
        short_name: config.festivalName.length > 15 ? "ArtsFest" : config.festivalName,
        description: `Celebrating Culture & Creativity at ${config.festivalName}.`,
        background_color: '#000000',
        theme_color: '#8B0000',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
            {
                src: config.appFavicon || '/favicon.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable'
            },
            {
                src: config.appFavicon || '/favicon.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any'
            }
        ],
    }
}
