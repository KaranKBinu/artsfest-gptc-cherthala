import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/middleware'
import type { ApiResponse } from '@/types'

async function handler(request: NextRequest, context: { user: { userId: string; role: string } }) {
    try {
        const { searchParams } = new URL(request.url)
        const houseId = searchParams.get('houseId')
        const format = searchParams.get('format') || 'json'

        const where: any = {
            role: 'STUDENT',
        }

        if (houseId) {
            where.houseId = houseId
        }

        const students = await prisma.user.findMany({
            where,
            include: {
                House: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                    },
                },
                Registration: {
                    where: {
                        status: { not: 'CANCELLED' },
                    },
                    include: {
                        Program: {
                            select: {
                                name: true,
                                type: true,
                                category: true,
                            },
                        },
                    },
                },
                Attendance_Attendance_userIdToUser: {
                    select: {
                        isPresent: true,
                    },
                },
            },
            orderBy: [{ House: { name: 'asc' } }, { fullName: 'asc' }],
        })

        const report = students.map((student) => ({
            fullName: student.fullName,
            studentAdmnNo: student.studentAdmnNo,
            email: student.email,
            department: student.department,
            semester: student.semester,
            house: student.House?.name,
            totalPrograms: student.Registration.length,
            attendanceCount: student.Attendance_Attendance_userIdToUser.filter((a) => a.isPresent).length,
            programs: student.Registration.map((r) => ({
                name: r.Program.name,
                type: r.Program.type,
                category: r.Program.category,
                isGroup: r.isGroup,
                groupName: r.groupName,
            })),
        }))

        if (format === 'csv') {
            // Generate CSV
            const headers = [
                'Full Name',
                'Admission No',
                'Email',
                'Department',
                'Semester',
                'House',
                'Total Programs',
                'Attendance Count',
            ]
            const csvRows = [headers.join(',')]

            report.forEach((row) => {
                csvRows.push(
                    [
                        row.fullName,
                        row.studentAdmnNo,
                        row.email,
                        row.department || '',
                        row.semester || '',
                        row.house || '',
                        row.totalPrograms,
                        row.attendanceCount,
                    ].join(',')
                )
            })

            const csv = csvRows.join('\n')

            return new NextResponse(csv, {
                status: 200,
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="house-report-${Date.now()}.csv"`,
                },
            })
        }

        return NextResponse.json<ApiResponse>(
            {
                success: true,
                data: report,
            },
            { status: 200 }
        )
    } catch (error: any) {
        console.error('House report error:', error)
        return NextResponse.json<ApiResponse>(
            {
                success: false,
                error: error.message || 'Failed to generate house report',
            },
            { status: 500 }
        )
    }
}

export const GET = withAuth(handler, { roles: ['ADMIN', 'MASTER'] as any })
