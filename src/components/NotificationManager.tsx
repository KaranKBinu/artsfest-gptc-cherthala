'use client'

import { useEffect, useState } from 'react'
import { subscribeUser } from '@/actions/notifications'
import { urlBase64ToUint8Array, arrayBufferToBase64 } from '@/utils/notifications'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

export default function NotificationManager() {
    const [isSupported, setIsSupported] = useState(false)
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [isDismissed, setIsDismissed] = useState(false)
    const [permission, setPermission] = useState<NotificationPermission>('default')
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true)
            setPermission(Notification.permission)

            // Check if dismissed
            const dismissed = localStorage.getItem('push_notification_dismissed')
            if (dismissed === 'true') setIsDismissed(true)

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
        if (!registration || !VAPID_PUBLIC_KEY) {
            console.error('No registration or VAPID key found')
            if (!VAPID_PUBLIC_KEY) alert('VAPID public key not configured on server')
            return
        }

        try {
            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            })

            // Convert keys to strings for storage
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
                setPermission('granted')
                alert('You have successfully subscribed to notifications!')
            }

        } catch (e) {
            console.error('Failed to subscribe:', e)
            alert('Failed to subscribe to notifications. Please ensure you have granted permission.')
            if (Notification.permission === 'denied') {
                setPermission('denied')
            }
        }
    }

    const dismiss = () => {
        setIsDismissed(true)
        localStorage.setItem('push_notification_dismissed', 'true')
    }

    if (!isSupported || isSubscribed || isDismissed || permission === 'denied') return null

    return (
        <div className="fixed bottom-20 right-4 z-50 animate-fade-in">
            <div className="flex items-center gap-2 bg-gradient-to-r from-red-700 to-red-900 text-white pl-4 pr-2 py-2 rounded-full shadow-lg hover:shadow-xl backdrop-blur-sm bg-opacity-90 border border-white/10 transition-all hover:scale-105">
                <button
                    onClick={subscribe}
                    className="flex items-center gap-2 font-medium text-sm hover:text-gray-200 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                    </svg>
                    Enable Updates
                </button>
                <div className="w-px h-4 bg-white/20 mx-1"></div>
                <button
                    onClick={dismiss}
                    className="p-1 hover:bg-white/20 rounded-full transition-colors"
                    aria-label="Dismiss"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        </div>
    )
}
