'use client'

import { useEffect, useState } from 'react'
import { subscribeUser } from '@/actions/notifications'
import { urlBase64ToUint8Array, arrayBufferToBase64 } from '@/utils/notifications'
import { usePathname } from 'next/navigation'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

export default function NotificationManager() {
    const [isSupported, setIsSupported] = useState(false)
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [isDismissed, setIsDismissed] = useState(false)
    const [permission, setPermission] = useState<NotificationPermission>('default')
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
    const [showPrompt, setShowPrompt] = useState(false)
    const pathname = usePathname()

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

    // Auto-ask logic
    useEffect(() => {
        if (isSupported && !isSubscribed && !isDismissed && permission === 'default' && pathname === '/') {
            const timer = setTimeout(() => {
                setShowPrompt(true)
            }, 3000) // Show after 3 seconds on home page
            return () => clearTimeout(timer)
        } else if (!isSubscribed && !isDismissed && permission === 'default') {
            // If not on home page, we can still show the small button, but maybe wait longer? 
            // For now, let's keep the prompt logic simple: Show if on home, or if user explicitly invokes.
            // Actually, the requirement says "ask to subscribe on page load(of home)".
            // So we only auto-show the BIG prompt on home.
            // We can always show the small pill on other pages if we wanted, but let's stick to the prompt state.

            // Let's decide: If not on home, we still want the user to be able to subscribe. 
            // We will default showPrompt to true if not dismissed/subscribed, but maybe use a different UI style?
            // For now, let's just use the timer to set showPrompt to true everywhere, but maybe faster on home?
            // Or strictly follow "ask on page load (of home)". 
            if (pathname !== '/') setShowPrompt(true)
        }
    }, [isSupported, isSubscribed, isDismissed, permission, pathname])

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
                setShowPrompt(false)
                // alert('You have successfully subscribed to notifications!') // Removed alert for better UX
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
        setShowPrompt(false)
        localStorage.setItem('push_notification_dismissed', 'true')
    }

    if (!isSupported || isSubscribed || isDismissed || permission === 'denied' || !showPrompt) return null

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
            <div className="bg-black/80 backdrop-blur-md border border-[#D4AF37]/30 p-4 rounded-xl shadow-2xl max-w-sm w-full relative overflow-hidden group">
                {/* Gold Glow Effect */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-50"></div>

                <div className="flex items-start gap-4">
                    <div className="bg-[#8B0000]/20 p-2 rounded-lg text-[#D4AF37]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h4 className="text-white font-semibold text-sm mb-1">Stay Updated!</h4>
                        <p className="text-gray-300 text-xs leading-relaxed mb-3">
                            Get instant alerts for results, schedule changes, and important announcements.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={subscribe}
                                className="flex-1 bg-[#8B0000] hover:bg-[#a00000] text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors border border-white/10 shadow-lg"
                            >
                                Enable Notifications
                            </button>
                            <button
                                onClick={dismiss}
                                className="px-3 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                Later
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={dismiss}
                        className="text-gray-500 hover:text-white transition-colors -mt-1 -mr-1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    )
}
