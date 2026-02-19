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
    const [showPrompt, setShowPrompt] = useState(false) // Controls the full card visibility
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

    if (!isSupported || isSubscribed || isDismissed || permission === 'denied') return null

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4" style={{ fontFamily: 'var(--font-inter)' }}>
            {/* Full Prompt Card */}
            {showPrompt && (
                <div
                    className="animate-in slide-in-from-bottom-5 fade-in duration-500"
                    style={{
                        backgroundColor: 'rgba(10, 10, 10, 0.9)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(212, 175, 55, 0.3)',
                        borderRadius: '12px',
                        padding: '16px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                        maxWidth: '350px',
                        width: '100%',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    <div style={{
                        position: 'absolute', top: 0, left: 0, width: '100%', height: '4px',
                        background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)',
                        opacity: 0.5
                    }} />

                    <div className="flex items-start gap-4">
                        <div style={{
                            backgroundColor: 'rgba(139, 0, 0, 0.2)',
                            padding: '10px',
                            borderRadius: '8px',
                            color: '#D4AF37'
                        }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h4 style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>Stay Updated!</h4>
                            <p style={{ color: '#ccc', fontSize: '0.8rem', lineHeight: '1.4', marginBottom: '12px' }}>
                                Get instant alerts for results, schedule changes, and important announcements.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={subscribe}
                                    style={{
                                        flex: 1,
                                        backgroundColor: '#8B0000',
                                        color: 'white',
                                        fontSize: '0.8rem',
                                        fontWeight: 500,
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#a00000'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#8B0000'}
                                >
                                    Enable Notifications
                                </button>
                                <button
                                    onClick={() => setShowPrompt(false)}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        fontSize: '0.8rem',
                                        fontWeight: 500,
                                        color: '#aaa',
                                        backgroundColor: 'transparent',
                                        cursor: 'pointer',
                                        transition: 'color 0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
                                    onMouseOut={(e) => e.currentTarget.style.color = '#aaa'}
                                >
                                    Later
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={dismiss}
                            style={{ color: '#666', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', marginTop: '-4px', marginRight: '-4px' }}
                            onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
                            onMouseOut={(e) => e.currentTarget.style.color = '#666'}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Floating Updates Button (Only visible if prompt is hidden) */}
            {!showPrompt && (
                <button
                    onClick={() => setShowPrompt(true)}
                    className="flex items-center gap-2 group hover:scale-105 transition-transform duration-300"
                    style={{
                        background: 'linear-gradient(135deg, #8B0000 0%, #5a0000 100%)',
                        color: 'white',
                        padding: '10px 20px',
                        borderRadius: '50px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(212, 175, 55, 0.3)',
                        cursor: 'pointer',
                        backdropFilter: 'blur(4px)'
                    }}
                >
                    <div style={{
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        padding: '6px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', letterSpacing: '0.5px' }}>
                        Get Updates
                    </span>
                    <span style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: '#D4AF37',
                        borderRadius: '50%',
                        display: 'inline-block',
                        boxShadow: '0 0 8px #D4AF37',
                        animation: 'pulse 2s infinite'
                    }} />
                </button>
            )}
        </div>
    )
}
