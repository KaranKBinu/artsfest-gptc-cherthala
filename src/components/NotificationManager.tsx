'use client'

import { useEffect, useRef, useState } from 'react'
import { subscribeUser } from '@/actions/notifications'
import { urlBase64ToUint8Array, arrayBufferToBase64 } from '@/utils/notifications'
import { usePathname } from 'next/navigation'
import { useModals } from '@/context/ModalContext'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

export default function NotificationManager() {
    const [isSupported, setIsSupported] = useState(false)
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
    const pathname = usePathname()
    const { showToast } = useModals()
    const [hasAttemptedAutoSubscribe, setHasAttemptedAutoSubscribe] = useState(false)

    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true)

            navigator.serviceWorker.ready.then(reg => {
                setRegistration(reg)
                reg.pushManager.getSubscription().then(sub => {
                    if (sub) {
                        setIsSubscribed(true)
                    }
                })
            })
        }
    }, [])

    const subscribe = async () => {
        if (!registration || !VAPID_PUBLIC_KEY) return

        try {
            // This is the direct browser prompt
            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            })

            const p256dh = sub.getKey('p256dh')
            const auth = sub.getKey('auth')

            if (p256dh && auth) {
                const subscriptionData = {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: arrayBufferToBase64(p256dh),
                        auth: arrayBufferToBase64(auth)
                    }
                }

                await subscribeUser(subscriptionData)
                setIsSubscribed(true)
                showToast('Notifications enabled successfully!', 'success')
            }

        } catch (e) {
            console.error('Failed to subscribe during auto-prompt:', e)
            // If it failed because of user interaction requirement, we might silently fail here.
            // But if it was a denial, we respect it.
        }
    }

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
    }, [pathname, isSupported, isSubscribed, hasAttemptedAutoSubscribe, registration])

    // No UI rendered
    return null
}
