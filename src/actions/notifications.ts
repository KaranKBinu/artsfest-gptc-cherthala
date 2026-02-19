'use server'

import { prisma } from '@/lib/prisma'
import { PushSubscription } from '@prisma/client'
import webpush from 'web-push'

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(
        'mailto:arts@gptccherthala.org',
        vapidPublicKey,
        vapidPrivateKey
    )
}

export interface PushSubscriptionData {
    endpoint: string
    keys: {
        p256dh: string
        auth: string
    }
}

export async function subscribeUser(subscription: PushSubscriptionData, userId?: string) {
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
        throw new Error('Invalid subscription object')
    }

    try {
        const existing = await prisma.pushSubscription.findUnique({
            where: { endpoint: subscription.endpoint }
        })

        if (existing) {
            await prisma.pushSubscription.update({
                where: { endpoint: subscription.endpoint },
                data: {
                    userId: userId || existing.userId, // Update user if provided
                    updatedAt: new Date()
                }
            })
        } else {
            await prisma.pushSubscription.create({
                data: {
                    endpoint: subscription.endpoint,
                    p256dh: subscription.keys.p256dh,
                    auth: subscription.keys.auth,
                    userId: userId || null
                }
            })
        }

        return { success: true }
    } catch (error) {
        console.error('Failed to save subscription:', error)
        return { success: false, error: 'Failed to save subscription' }
    }
}

export async function sendNotification(data: { title: string; body: string; userId?: string; url?: string; icon?: string }) {
    if (!vapidPublicKey || !vapidPrivateKey) {
        console.warn('VAPID keys not configured')
        return { success: false, error: 'VAPID keys missing' }
    }

    try {
        const whereClause = data.userId ? { userId: data.userId } : {}
        const subscriptions = await prisma.pushSubscription.findMany({
            where: whereClause
        })

        const payload = JSON.stringify({
            title: data.title,
            body: data.body,
            icon: data.icon || '/icon-192x192.png',
            badge: '/icon-192x192.png',
            url: data.url || '/'
        })

        if (subscriptions.length === 0) {
            return { success: true, count: 0, failureCount: 0 }
        }

        let successCount = 0
        let failureCount = 0

        // Batch processing
        const BATCH_SIZE = 50
        for (let i = 0; i < subscriptions.length; i += BATCH_SIZE) {
            const batch = subscriptions.slice(i, i + BATCH_SIZE)

            const batchPromises = batch.map(async (sub) => {
                const pushConfig = {
                    endpoint: sub.endpoint,
                    keys: {
                        auth: sub.auth,
                        p256dh: sub.p256dh,
                    },
                }

                try {
                    await webpush.sendNotification(pushConfig, payload)
                    successCount++
                } catch (err: any) {
                    if (err.statusCode === 404 || err.statusCode === 410) {
                        await prisma.pushSubscription.delete({
                            where: { endpoint: sub.endpoint }
                        })
                    } else {
                        console.error('Error sending notification to', sub.endpoint, err)
                    }
                    failureCount++
                }
            })

            await Promise.all(batchPromises)
        }

        return { success: true, successCount, failureCount }

    } catch (error) {
        console.error('Error sending notifications:', error)
        return { success: false, error: 'Failed to send notifications' }
    }
}
