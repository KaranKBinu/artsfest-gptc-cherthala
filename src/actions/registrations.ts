'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { RegistrationStatus } from '@prisma/client'

export async function updateRegistrationStatus(registrationId: string, status: RegistrationStatus) {
    try {
        const registration = await prisma.registration.update({
            where: { id: registrationId },
            data: { status }
        })
        revalidatePath('/dashboard')
        return { success: true, data: registration }
    } catch (error) {
        console.error('Failed to update registration status:', error)
        return { success: false, error: 'Failed to update registration status' }
    }
}
