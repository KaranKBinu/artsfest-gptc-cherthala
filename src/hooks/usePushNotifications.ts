'use client'

import { useState, useEffect } from 'react'
import { subscribeUser } from '@/actions/notifications'
import { urlBase64ToUint8Array, arrayBufferToBase64 } from '@/utils/notifications'
import { useModals } from '@/context/ModalContext'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

export function usePushNotifications() {
    const [isSupported, setIsSupported] = useState(false)
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
    const { showToast } = useModals()

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
        if (!registration || !VAPID_PUBLIC_KEY) {
            console.error('No registration or VAPID key found')
            if (!VAPID_PUBLIC_KEY) showToast('Push notifications not configured properly.', 'error')
            return false
        }

        try {
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
                return true
            }
        } catch (e) {
            console.error('Failed to subscribe:', e)
            if (Notification.permission === 'denied') {
                showToast('Permission denied. Please enable notifications in browser settings.', 'error')
            } else {
                showToast('Failed to subscribe to notifications.', 'error')
            }
            return false
        }
        return false
    }

    return { isSupported, isSubscribed, subscribe, registration }
}
