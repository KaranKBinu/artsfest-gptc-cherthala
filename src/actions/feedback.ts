'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function submitFeedback(formData: {
    name: string
    email: string
    subject?: string
    message: string
    category?: string
}) {
    try {
        if (!formData.name || !formData.email || !formData.message) {
            return { success: false, error: 'All compulsory fields must be filled.' }
        }

        const feedback = await prisma.feedback.create({
            data: {
                name: formData.name,
                email: formData.email,
                subject: formData.subject || 'No Subject',
                message: formData.message,
                category: formData.category || 'FEEDBACK'
            }
        })

        revalidatePath('/dashboard') // In case there's an admin view for feedbacks

        return { success: true, data: feedback }
    } catch (error: any) {
        console.error('Feedback submission error:', error)
        return { success: false, error: error.message || 'Something went wrong. Please try again later.' }
    }
}

export async function getFeedbacks() {
    try {
        // This should probably be protected, but for now just basic fetch
        const feedbacks = await prisma.feedback.findMany({
            orderBy: { createdAt: 'desc' }
        })
        return { success: true, data: feedbacks }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
