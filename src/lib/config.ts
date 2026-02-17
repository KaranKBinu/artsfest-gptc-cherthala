import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export interface AppConfig {
    festivalName: string
    festivalYear: string
    galleryImages: string
    galleryText: string
    notifications: string
    artsFestManual: string
    contactInfo: string
    teamMembers: string
    showScoreboard: boolean
    showRegistration: boolean
    showLogin: boolean
    departments: {
        code: string
        name: string
    }[]
    appFavicon: string
    appLogo: string
}

// Simple in-memory cache to avoid hitting DB on every request if needed
let configCache: AppConfig | null = null
let lastFetchTime = 0
const CACHE_TTL = 60000 // 1 minute

export function invalidateConfigCache() {
    configCache = null
    lastFetchTime = 0
}

export async function getAppConfig(): Promise<AppConfig> {
    const now = Date.now()
    if (configCache && (now - lastFetchTime < CACHE_TTL)) {
        return configCache
    }

    try {
        const configs = await prisma.configuration.findMany()
        const configMap = new Map(configs.map(c => [c.key, c.value]))
        const configMapLower = new Map(configs.map(c => [c.key.toLowerCase(), c.value]))

        const getValue = (key: string) => configMap.get(key) || configMapLower.get(key.toLowerCase())

        const festivalName = getValue('festivalName') || 'ArtsFest GPTC'
        const festivalYear = getValue('festivalYear') || new Date().getFullYear().toString()
        const galleryImages = getValue('galleryImages') || '[]'
        const galleryText = getValue('galleryText') || ''
        const notifications = getValue('notifications') || '[]'
        const artsFestManual = getValue('artsFestManual') || ''
        const contactInfo = getValue('contactInfo') || JSON.stringify({ title: 'Contact Us', email: 'arts@gptccherthala.org', phone: '+91 9876543210', address: 'GPTC Cherthala' })
        const teamMembers = getValue('teamMembers') || '[]'
        const showScoreboardValue = getValue('showScoreboard')?.trim().toLowerCase()
        const showScoreboard = showScoreboardValue === 'true' || showScoreboardValue === 'yes' || showScoreboardValue === '1'

        const showRegistrationValue = getValue('showRegistration')?.trim().toLowerCase()
        const showRegistration = showRegistrationValue === undefined ? true : (showRegistrationValue === 'true' || showRegistrationValue === 'yes' || showRegistrationValue === '1')

        const showLoginValue = getValue('showLogin')?.trim().toLowerCase()
        const showLogin = showLoginValue === undefined ? true : (showLoginValue === 'true' || showLoginValue === 'yes' || showLoginValue === '1')

        // Proactively ensure these keys exist in DB if missing, so they show up in settings UI
        // This is a "lazy seed" for new config toggles
        const ensureKey = async (key: string, value: string, desc: string) => {
            if (getValue(key) === undefined) {
                try {
                    await prisma.configuration.create({
                        data: {
                            id: crypto.randomUUID(),
                            key,
                            value,
                            description: desc,
                            updatedAt: new Date()
                        }
                    })
                } catch (e) { /* ignore collision or err */ }
            }
        }

        // Only do this if we are not in a read-only environment if possible, 
        // but here we just try and ignore errors.
        if (typeof window === 'undefined') {
            ensureKey('showRegistration', 'true', 'Show register button and link in Navbar/Home')
            ensureKey('showLogin', 'true', 'Show login button and link in Navbar/Home')
        }

        let departments: AppConfig['departments'] = []
        const deptJson = getValue('departments')
        if (deptJson) {
            try {
                departments = JSON.parse(deptJson)
            } catch (e) {
                console.error('Failed to parse departments config', e)
            }
        }

        // Apply defaults if empty (e.g. first run before seed)
        if (departments.length === 0) {
            departments = [
                { code: 'CHE', name: 'Computer Hardware Engineering' },
                { code: 'CT', name: 'Computer Engineering' },
                { code: 'ME', name: 'Mechanical Engineering' },
                { code: 'IE', name: 'Instrumentation Engineering' },
                { code: 'EC', name: 'Electronics & Communication' },
            ]
        }

        configCache = {
            festivalName,
            festivalYear,
            galleryImages,
            galleryText,
            notifications,
            artsFestManual,
            contactInfo,
            teamMembers,
            showScoreboard,
            showRegistration,
            showLogin,
            departments,
            appFavicon: getValue('appFavicon') || '/favicon.png',
            appLogo: getValue('appLogo') || '/favicon.png'
        }
        lastFetchTime = now

        return configCache
    } catch (error) {
        console.error('Failed to fetch app config from DB:', error)
        // Fallback
        return {
            festivalName: 'ArtsFest GPTC',
            festivalYear: new Date().getFullYear().toString(),
            galleryImages: '[]',
            galleryText: '',
            notifications: '[]',
            artsFestManual: '',
            contactInfo: JSON.stringify({ title: 'Contact Us', email: 'arts@gptccherthala.org', phone: '+91 9876543210', address: 'GPTC Cherthala' }),
            teamMembers: '[]',
            showScoreboard: false,
            showRegistration: true,
            showLogin: true,
            departments: [
                { code: 'CHE', name: 'Computer Hardware Engineering' },
                { code: 'CT', name: 'Computer Engineering' },
                { code: 'ME', name: 'Mechanical Engineering' },
                { code: 'IE', name: 'Instrumentation Engineering' },
                { code: 'EC', name: 'Electronics & Communication' },
            ],
            appFavicon: '/favicon.png',
            appLogo: '/favicon.png'
        }
    }
}
