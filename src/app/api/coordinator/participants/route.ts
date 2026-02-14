import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/middleware'
import type { ApiResponse } from '@/types'

async function handler(request: NextRequest, context: { user: { userId: string; role: string } }) {
    try {
        const { searchParams } = new URL(request.url)
        const programId = searchParams.get('programId')

        if (!programId) {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error: 'Program ID is required',
                },
                { status: 400 }
            )
        }

        const registrations = await prisma.registration.findMany({
            where: {
                programId,
                status: { not: 'CANCELLED' },
            },
            include: {
                User: {
                    select: {
                        id: true,
                        fullName: true,
                        studentAdmnNo: true,
                        email: true,
                        department: true,
                        semester: true,
                    },
                },
                House: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                    },
                },
                GroupMember: {
                    include: {
                        User: {
                            select: {
                                id: true,
                                fullName: true,
                                studentAdmnNo: true,
                            },
                        },
                    },
                },
                Attendance: {
                    select: {
                        id: true,
                        isPresent: true,
                        markedAt: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        })

        const mappedParticipants = registrations.map(r => ({
            ...r,
            user: r.User,
            house: r.House,
            groupMembers: r.GroupMember.map(gm => ({
                ...gm,
                user: gm.User
            })),
            attendances: r.Attendance
        }))

        return NextResponse.json<ApiResponse>(
            {
                success: true,
                data: mappedParticipants,
            },
            { status: 200 }
        )
    } catch (error: any) {
        console.error('Get participants error:', error)
        return NextResponse.json<ApiResponse>(
            {
                success: false,
                error: error.message || 'Failed to fetch participants',
            },
            { status: 500 }
        )
    }
}

export const GET = withAuth(handler, { roles: ['COORDINATOR', 'ADMIN'] as any })
