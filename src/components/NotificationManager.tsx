'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { usePushNotifications } from '@/hooks/usePushNotifications'

export default function NotificationManager() {
    const { isSupported, isSubscribed, subscribe, registration } = usePushNotifications()
    const pathname = usePathname()
    const [hasAttemptedAutoSubscribe, setHasAttemptedAutoSubscribe] = useState(false)

    // Auto-ask logic - simplified
    useEffect(() => {
        // Only run on home page, if supported, not already subscribed, and haven't tried yet
        if (pathname === '/' && isSupported && !isSubscribed && !hasAttemptedAutoSubscribe && registration) {

            // Check if permission is default (not denied or already granted)
            if (Notification.permission === 'default') {
                // Try to subscribe directly. 
                // Note: Modern browsers (Chrome 60+, Safari 12.1+) block this without user gesture.
                // However, we are following the user's specific request to "ask directly on load".
                // If it fails, they might need to relax their browser settings or we fall back to a UI (not included here as per request).

                // We add a small delay to ensure page is interactive
                const timer = setTimeout(() => {
                    subscribe()
                    setHasAttemptedAutoSubscribe(true)
                }, 1000)

                return () => clearTimeout(timer)
            }
        }
    }, [pathname, isSupported, isSubscribed, hasAttemptedAutoSubscribe, registration, subscribe])

    // No UI rendered
    return null
}
