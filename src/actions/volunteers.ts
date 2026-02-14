'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getVolunteers() {
    try {
        const volunteers = await prisma.user.findMany({
            where: {
                isVolunteer: true
            },
            include: {
                House: {
                    select: {
                        name: true,
                        color: true
                    }
                }
            },
            orderBy: {
                fullName: 'asc'
            }
        })
        return { success: true, data: volunteers }
    } catch (error) {
        console.error('Failed to fetch volunteers:', error)
        return { success: false, error: 'Failed to fetch volunteers' }
    }
}

export async function addVolunteer(admnNo: string) {
    try {
        const user = await prisma.user.findFirst({
            where: { studentAdmnNo: admnNo }
        })

        if (!user) {
            return { success: false, error: 'Student not found with this Admission Number' }
        }

        if (user.role !== 'STUDENT') {
            return { success: false, error: 'Only students can be added as volunteers' }
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { isVolunteer: true }
        })

        revalidatePath('/dashboard')
        return { success: true, message: 'Volunteer added successfully' }
    } catch (error) {
        console.error('Failed to add volunteer:', error)
        return { success: false, error: 'Failed to add volunteer' }
    }
}

export async function removeVolunteer(userId: string) {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { isVolunteer: false }
        })

        revalidatePath('/dashboard')
        return { success: true, message: 'Volunteer removed successfully' }
    } catch (error) {
        console.error('Failed to remove volunteer:', error)
        return { success: false, error: 'Failed to remove volunteer' }
    }
}
