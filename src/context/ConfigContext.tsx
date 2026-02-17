'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface TeamMember {
    name: string
    role: string
    email: string
    photo?: string
}

interface AppConfig {
    festivalName: string
    festivalYear: string
    galleryImages: string[]
    galleryText: string
    notifications: any[]
    artsFestManual: string
    contactInfo: any
    teamMembers: TeamMember[]
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

interface ConfigContextType {
    config: AppConfig
    loading: boolean
    refreshConfig: () => Promise<void>
}

const defaultConfig: AppConfig = {
    festivalName: 'ArtsFest GPTC',
    festivalYear: new Date().getFullYear().toString(),
    galleryImages: [],
    galleryText: '',
    notifications: [],
    artsFestManual: '',
    contactInfo: null,
    teamMembers: [],
    showScoreboard: false,
    showRegistration: true,
    showLogin: true,
    departments: [],
    appFavicon: '/favicon.png',
    appLogo: '/favicon.png'
}

const ConfigContext = createContext<ConfigContextType>({
    config: defaultConfig,
    loading: true,
    refreshConfig: async () => { }
})

export function ConfigProvider({ children }: { children: ReactNode }) {
    const [config, setConfig] = useState<AppConfig>(defaultConfig)
    const [loading, setLoading] = useState(true)

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/config', { cache: 'no-store' })
            const data = await res.json()
            if (data.success) {
                const d = data.data

                // Parse JSON fields safely
                let galleryImages: string[] = []
                try {
                    galleryImages = JSON.parse(d.galleryImages || '[]')
                    if (!Array.isArray(galleryImages)) galleryImages = []
                } catch (e) { }

                let notifications: any[] = []
                try {
                    notifications = JSON.parse(d.notifications || '[]')
                    if (!Array.isArray(notifications)) notifications = []
                } catch (e) { }

                let departments = []
                try {
                    departments = JSON.parse(d.departments || '[]')
                } catch (e) { }

                let contactInfo = null
                try {
                    contactInfo = JSON.parse(d.contactInfo || '{}')
                } catch (e) { }

                let teamMembers = []
                try {
                    teamMembers = JSON.parse(d.teamMembers || '[]')
                    if (!Array.isArray(teamMembers)) teamMembers = []
                } catch (e) { }

                setConfig({
                    festivalName: d.festivalName || defaultConfig.festivalName,
                    festivalYear: d.festivalYear || defaultConfig.festivalYear,
                    galleryImages,
                    galleryText: d.galleryText || '',
                    notifications,
                    artsFestManual: d.artsFestManual || '',
                    contactInfo,
                    teamMembers,
                    showScoreboard: d.showScoreboard === true || d.showScoreboard === 'true',
                    showRegistration: d.showRegistration === true || d.showRegistration === 'true',
                    showLogin: d.showLogin === true || d.showLogin === 'true',
                    departments,
                    appFavicon: d.appFavicon || defaultConfig.appFavicon,
                    appLogo: d.appLogo || defaultConfig.appLogo
                })
            }
        } catch (error) {
            console.error('Failed to fetch config', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchConfig()
        const interval = setInterval(fetchConfig, 60000) // Refresh config every minute
        return () => clearInterval(interval)
    }, [])

    return (
        <ConfigContext.Provider value={{ config, loading, refreshConfig: fetchConfig }}>
            {children}
        </ConfigContext.Provider>
    )
}

export const useConfig = () => useContext(ConfigContext)

