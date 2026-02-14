import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/middleware'
import type { ApiResponse } from '@/types'

async function handler(request: NextRequest, context: { user: { userId: string; role: string } }) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: context.user.userId },
            select: {
                id: true,
                fullName: true,
                email: true,
                studentAdmnNo: true,
                role: true,
                gender: true,
                department: true,
                semester: true,
                isVolunteer: true,
                House: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                    },
                },
            },
        })

        if (!user) {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error: 'User not found',
                },
                { status: 404 }
            )
        }

        // Map House to house for frontend consistency
        const { House, ...userData } = user
        const mappedUser = {
            ...userData,
            house: House,
            department: user.department || undefined,
            semester: user.semester || undefined,
        }

        return NextResponse.json<ApiResponse>(
            {
                success: true,
                data: mappedUser,
            },
            { status: 200 }
        )
    } catch (error: any) {
        console.error('Get current user error:', error)
        return NextResponse.json<ApiResponse>(
            {
                success: false,
                error: error.message || 'Failed to get user information',
            },
            { status: 500 }
        )
    }
}

export const GET = withAuth(handler)
