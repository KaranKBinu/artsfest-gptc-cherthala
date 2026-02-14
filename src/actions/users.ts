'use server'

import { prisma } from '@/lib/prisma'

export async function searchTeamMembers(query: string, houseId: string, currentUserId: string) {
    if (!query || query.length < 2) return { success: true, data: [] }

    try {
        const users = await prisma.user.findMany({
            where: {
                houseId: houseId,
                NOT: {
                    id: currentUserId
                },
                OR: [
                    { fullName: { contains: query, mode: 'insensitive' } },
                    { studentAdmnNo: { contains: query, mode: 'insensitive' } }
                ]
            },
            take: 5,
            select: {
                id: true,
                fullName: true,
                studentAdmnNo: true,
                department: true
            }
        })

        return { success: true, data: users }
    } catch (error) {
        console.error('Search failed:', error)
        return { success: false, error: 'Search failed' }
    }
}

export async function getHouseMembers(houseId: string, currentUserId: string) {
    try {
        const users = await prisma.user.findMany({
            where: {
                houseId: houseId,
                NOT: {
                    id: currentUserId,
                    role: { in: ['ADMIN', 'COORDINATOR', 'MASTER'] } // Exclude non-students if necessary, though roles allows students.
                }
            },
            orderBy: {
                fullName: 'asc'
            },
            select: {
                id: true,
                fullName: true,
                studentAdmnNo: true,
                department: true
            }
        })

        return { success: true, data: users }
    } catch (error) {
        console.error('Failed to fetch house members:', error)
        return { success: false, error: 'Failed to fetch house members' }
    }
}

export async function getUsersForAdmin(params: {
    query?: string
    houseId?: string
    department?: string
    programId?: string
    hasRegistrations?: boolean
    page?: number
    limit?: number
    coordinatorId?: string
    attendanceStatus?: 'ALL' | 'PRESENT' | 'ABSENT' | 'NOT_MARKED'
    certStatus?: 'ALL' | 'SENT' | 'NOT_SENT'
}) {
    const { query, houseId, department, programId, hasRegistrations, page = 1, limit = 20, coordinatorId, attendanceStatus, certStatus } = params
    const skip = (page - 1) * limit

    try {
        const where: any = {
            role: 'STUDENT'
        }

        // Coordinator Logic
        let assignedProgramIds: string[] = []
        if (coordinatorId) {
            const coordinator = await prisma.user.findUnique({
                where: { id: coordinatorId },
                include: { assignedPrograms: { select: { id: true } } }
            })
            if (coordinator && coordinator.assignedPrograms) {
                assignedProgramIds = coordinator.assignedPrograms.map(p => p.id)
            }
        }

        if (query) {
            where.OR = [
                { fullName: { contains: query, mode: 'insensitive' } },
                { studentAdmnNo: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } }
            ]
        }

        if (houseId && houseId !== 'ALL') {
            where.houseId = houseId
        }

        if (department && department !== 'ALL') {
            where.department = department
        }

        // Complex registration filtering
        let registrationWhere: any = null

        if (coordinatorId) {
            registrationWhere = { programId: { in: assignedProgramIds } }
        }

        if (programId && programId !== 'ALL') {
            registrationWhere = { ...registrationWhere, programId: programId }
        }

        if (attendanceStatus && attendanceStatus !== 'ALL') {
            registrationWhere = registrationWhere || {}
            if (attendanceStatus === 'PRESENT') {
                registrationWhere.Attendance = { some: { isPresent: true } }
            } else if (attendanceStatus === 'ABSENT') {
                registrationWhere.NOT = {
                    Attendance: {
                        some: { isPresent: true }
                    }
                }
            }
        }

        if (certStatus && certStatus !== 'ALL') {
            registrationWhere = registrationWhere || {}
            if (certStatus === 'SENT') {
                registrationWhere.Certificate = { some: { emailSent: true } }
            } else if (certStatus === 'NOT_SENT') {
                registrationWhere.NOT = {
                    Certificate: {
                        some: { emailSent: true }
                    }
                }
            }
        }

        if (registrationWhere) {
            where.Registration = { some: registrationWhere }
        } else if (hasRegistrations) {
            where.Registration = { some: {} }
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { fullName: 'asc' },
                include: {
                    House: {
                        select: { name: true, color: true }
                    },
                    Registration: {
                        where: coordinatorId ? { programId: { in: assignedProgramIds } } : undefined,
                        include: {
                            Program: {
                                select: { name: true, type: true, category: true, id: true }
                            },
                            Attendance: {
                                select: { isPresent: true }
                            },
                            Certificate: {
                                select: { emailSent: true }
                            }
                        }
                    }
                }
            }),
            prisma.user.count({ where })
        ])

        const mappedUsers = users.map(u => ({
            ...u,
            house: u.House,
            registrations: u.Registration.map(r => ({
                ...r,
                program: r.Program,
                attendances: r.Attendance,
                certificates: r.Certificate
            }))
        }))

        return { success: true, data: { users: mappedUsers, total, page, limit } }
    } catch (error) {
        console.error('Failed to fetch users:', error)
        return { success: false, error: 'Failed to fetch users' }
    }
}

export async function getHouses() {
    try {
        const houses = await prisma.house.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, name: true, color: true }
        })
        return { success: true, data: houses }
    } catch (error) {
        console.error('Failed to fetch houses:', error)
        return { success: false, error: 'Failed to fetch houses' }
    }
}

export async function getCoordinators() {
    try {
        const volunteers = await prisma.user.findMany({
            where: { role: 'COORDINATOR' },
            orderBy: { fullName: 'asc' },
            select: { id: true, fullName: true, email: true }
        })
        return { success: true, data: volunteers }
    } catch (error) {
        console.error('Failed to fetch coordinators:', error)
        return { success: false, error: 'Failed to fetch coordinators' }
    }
}

export async function updateUserRole(userId: string, role: 'STUDENT' | 'COORDINATOR' | 'ADMIN' | 'MASTER') {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { role }
        })
        return { success: true }
    } catch (error) {
        console.error('Failed to update user role:', error)
        return { success: false, error: 'Failed to update user role' }
    }
}
