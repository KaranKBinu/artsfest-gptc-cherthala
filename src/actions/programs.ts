'use server'

import { prisma } from '@/lib/prisma'
import { Program, ProgramCategory, ProgramType, RegistrationStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/mail'

export async function getPrograms(filters?: { category?: ProgramCategory }) {
    try {
        const where: any = {}
        if (filters?.category) {
            where.category = filters.category
        }

        const programs = await prisma.program.findMany({
            where,
            orderBy: { name: 'asc' },
            include: { volunteers: true }
        })

        return { success: true, data: programs }
    } catch (error) {
        console.error('Failed to fetch programs:', error)
        return { success: false, error: 'Failed to fetch programs' }
    }
}

export async function registerForProgram(
    userId: string,
    programId: string,
    isGroup: boolean,
    groupName?: string,
    groupMemberIds: string[] = []
) {
    try {
        // 1. Check if user exists
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { registrations: { include: { program: true } } }
        })

        if (!user) return { success: false, error: 'User not found' }

        // 2. Check if already registered
        const existingReg = user.registrations.find(r => r.programId === programId && r.status !== 'CANCELLED')
        if (existingReg) return { success: false, error: 'Already registered for this program' }

        // 3. Get program details
        const program = await prisma.program.findUnique({ where: { id: programId } })
        if (!program) return { success: false, error: 'Program not found' }

        // 4. Validate Group Members (if provided)
        if (isGroup && groupMemberIds.length > 0) {
            // Check if members exist and are in the same house
            const members = await prisma.user.findMany({
                where: {
                    id: { in: groupMemberIds },
                    houseId: user.houseId
                }
            })

            if (members.length !== groupMemberIds.length) {
                return { success: false, error: 'One or more selected members are invalid or belong to a different house.' }
            }

            // Check if members are already registered for this program
            // This is complex query, simpler to check one by one or trust the uniqueness constraint on GroupMember if existed, 
            // but we need to check their registrations.

            // Check for direct registrations or group memberships
            // For simplicity, we check if they have a registration for this program ID
            const memberRegistrations = await prisma.registration.findMany({
                where: {
                    userId: { in: groupMemberIds },
                    programId: programId,
                    status: { not: 'CANCELLED' }
                }
            })

            if (memberRegistrations.length > 0) {
                return { success: false, error: 'One or more members are already registered for this program.' }
            }

            // Also check if they are part of another group for this program (via GroupMember table)
            const memberGrouporships = await prisma.groupMember.findMany({
                where: {
                    userId: { in: groupMemberIds },
                    registration: {
                        programId: programId,
                        status: { not: 'CANCELLED' }
                    }
                }
            })

            if (memberGrouporships.length > 0) {
                return { success: false, error: 'One or more members are already part of another team for this program.' }
            }
        }


        // 5. Check system limits
        const configs = await prisma.configuration.findMany({
            where: {
                key: { in: ['maxOnStageSolo', 'maxOnStageGroup', 'maxOffStageTotal'] }
            }
        })

        const limits = {
            maxOnStageSolo: 0,
            maxOnStageGroup: 0,
            maxOffStageTotal: 0
        }

        configs.forEach(c => {
            if (c.key === 'maxOnStageSolo') limits.maxOnStageSolo = parseInt(c.value)
            if (c.key === 'maxOnStageGroup') limits.maxOnStageGroup = parseInt(c.value)
            if (c.key === 'maxOffStageTotal') limits.maxOffStageTotal = parseInt(c.value)
        })

        // Count current registrations
        let onStageSolo = 0
        let onStageGroup = 0
        let offStageTotal = 0

        user.registrations.forEach(r => {
            if (r.status === 'CANCELLED') return
            if (r.program.category === 'ON_STAGE') {
                if (r.program.type === 'SOLO') onStageSolo++
                if (r.program.type === 'GROUP') onStageGroup++
            } else {
                offStageTotal++
            }
        })

        // Validate against limits
        if (program.category === 'ON_STAGE') {
            if (program.type === 'SOLO') {
                if (onStageSolo >= limits.maxOnStageSolo) {
                    return { success: false, error: `Limit reached for On Stage Solo items (Max: ${limits.maxOnStageSolo})` }
                }
            } else {
                // GROUP
                if (onStageGroup >= limits.maxOnStageGroup) {
                    return { success: false, error: `Limit reached for On Stage Group items (Max: ${limits.maxOnStageGroup})` }
                }
            }
        } else {
            // OFF_STAGE
            if (offStageTotal >= limits.maxOffStageTotal) {
                return { success: false, error: `Limit reached for Off Stage items (Max: ${limits.maxOffStageTotal})` }
            }
        }

        // 6. Check if user has a house (Required for registration)
        if (!user.houseId) {
            return { success: false, error: 'You must be assigned to a house to register.' }
        }

        // 7. Create Registration with Transaction
        await prisma.$transaction(async (tx) => {
            // Create main registration
            const registration = await tx.registration.create({
                data: {
                    userId,
                    programId,
                    houseId: user.houseId!,
                    category: program.category,
                    isGroup,
                    groupName: isGroup ? groupName : null,
                    status: 'PENDING' // Or CONFIRMED depending on workflow. Assuming PENDING until verified? Or CONFIRMED by default. Schema says default CONFIRMED? No default is CONFIRMED in schema.
                }
            })

            // Add self as group member (Optional but good for consistency) 
            // Actually, schema usually links other members. The leader is linked via userId on Registration.
            // Let's add ONLY additional members to GroupMember table to avoid unique constraint issues if userId is unique in GroupMember for a reg.
            // Schema: GroupMember { registrationId, userId } unique.

            // Add other members
            if (groupMemberIds.length > 0) {
                await tx.groupMember.createMany({
                    data: groupMemberIds.map(mid => ({
                        registrationId: registration.id,
                        userId: mid
                    }))
                })
            }
        })

        revalidatePath('/dashboard')
        revalidatePath('/programs')

        return { success: true }

    } catch (error) {
        console.error('Registration failed:', error)
        return { success: false, error: 'Registration failed. Please try again.' }
    }
}

export async function getUserRegistrations(userId: string) {
    try {
        const registrations = await prisma.registration.findMany({
            where: {
                OR: [
                    { userId: userId },
                    { groupMembers: { some: { userId: userId } } }
                ],
                status: { not: 'CANCELLED' }
            },
            include: {
                program: true,
                user: {
                    select: {
                        fullName: true
                    }
                },
                groupMembers: {
                    include: {
                        user: {
                            select: {
                                fullName: true,
                                id: true
                            }
                        }
                    }
                }
            }
        })
        return { success: true, data: registrations }
    } catch (error) {
        console.error('Failed to fetch user registrations:', error)
        return { success: false, error: 'Failed to fetch registrations' }
    }
}

export async function registerForProgramsBatch(
    userId: string,
    registrations: {
        programId: string
        isGroup: boolean
        groupName?: string
        groupMemberIds?: string[]
    }[]
) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                registrations: {
                    where: { status: { not: RegistrationStatus.CANCELLED } },
                    include: { program: true }
                },
                groupMemberships: {
                    include: {
                        registration: {
                            include: { program: true }
                        }
                    }
                }
            }
        })

        if (!user) return { success: false, error: 'User not found' }
        if (!user.houseId) return { success: false, error: 'House not assigned' }

        // Get limits from config
        const configs = await prisma.configuration.findMany({
            where: { key: { in: ['maxOnStageSolo', 'maxOnStageGroup', 'maxOffStageTotal'] } }
        })
        const limits = { maxOnStageSolo: 0, maxOnStageGroup: 0, maxOffStageTotal: 0 }
        configs.forEach(c => {
            if (c.key === 'maxOnStageSolo') limits.maxOnStageSolo = parseInt(c.value)
            if (c.key === 'maxOnStageGroup') limits.maxOnStageGroup = parseInt(c.value)
            if (c.key === 'maxOffStageTotal') limits.maxOffStageTotal = parseInt(c.value)
        })

        // Current counts
        let onStageSolo = 0
        let onStageGroup = 0
        let offStageTotal = 0

        // Count registrations where user is the lead
        user.registrations.forEach((r: any) => {
            if (r.program.category === 'ON_STAGE') {
                if (r.program.type === 'SOLO') onStageSolo++
                if (r.program.type === 'GROUP') onStageGroup++
            } else { offStageTotal++ }
        })

        // Count registrations where user is a group member
        user.groupMemberships.forEach((m: any) => {
            const r = m.registration;
            if (!r || r.status === RegistrationStatus.CANCELLED) return;

            if (r.program.category === 'ON_STAGE') {
                if (r.program.type === 'GROUP') onStageGroup++
            } else { offStageTotal++ }
        })

        // Get all programs in batch
        const programIds = registrations.map(r => r.programId)
        const programs = await prisma.program.findMany({ where: { id: { in: programIds } } })

        // Check for already registered programs to prevent duplicates
        const existingProgramIds = new Set([
            ...user.registrations.map(r => r.programId),
            ...user.groupMemberships.map(m => m.registration?.programId).filter(Boolean)
        ])

        const newRegistrations = registrations.filter(r => !existingProgramIds.has(r.programId))

        if (newRegistrations.length === 0) {
            return { success: false, error: 'You are already registered for all selected programs.' }
        }

        // Validate limits before starting transaction
        for (const reg of newRegistrations) {
            const program = programs.find(p => p.id === reg.programId)
            if (!program) continue

            if (program.category === 'ON_STAGE') {
                if (program.type === 'SOLO') {
                    onStageSolo++
                    if (onStageSolo > limits.maxOnStageSolo) return { success: false, error: `Limit exceeded for On Stage Solo (Max: ${limits.maxOnStageSolo})` }
                } else {
                    onStageGroup++
                    if (onStageGroup > limits.maxOnStageGroup) return { success: false, error: `Limit exceeded for On Stage Group (Max: ${limits.maxOnStageGroup})` }
                }
            } else {
                offStageTotal++
                if (offStageTotal > limits.maxOffStageTotal) return { success: false, error: `Limit exceeded for Off Stage (Max: ${limits.maxOffStageTotal})` }
            }
        }

        // Transactional creation
        await prisma.$transaction(async (tx) => {
            for (const reg of newRegistrations) {
                const program = programs.find(p => p.id === reg.programId)
                if (!program) continue

                const newReg = await tx.registration.create({
                    data: {
                        userId,
                        programId: reg.programId,
                        houseId: user.houseId!,
                        category: program.category,
                        isGroup: reg.isGroup,
                        groupName: reg.isGroup ? reg.groupName : null,
                        status: 'CONFIRMED'
                    }
                })

                if (reg.isGroup && reg.groupMemberIds && reg.groupMemberIds.length > 0) {
                    await tx.groupMember.createMany({
                        data: reg.groupMemberIds.map(mid => ({
                            registrationId: newReg.id,
                            userId: mid
                        }))
                    })
                }
            }
        })

        revalidatePath('/dashboard')
        revalidatePath('/programs')

        // Send Email Notification
        try {
            const [configs, festivalNameConfig] = await Promise.all([
                prisma.configuration.findUnique({ where: { key: 'smtpConfig' } }),
                prisma.configuration.findUnique({ where: { key: 'festivalName' } })
            ])

            const festivalName = festivalNameConfig?.value || 'ArtsFest GPTC'
            const smtpStr = configs?.value || '{}'
            let smtpConfigObj: any = {}
            try { smtpConfigObj = JSON.parse(smtpStr) } catch (e) { }

            const registeredPrograms = newRegistrations.map(reg => {
                const p = programs.find(prog => prog.id === reg.programId)
                return {
                    name: p?.name || 'Unknown Program',
                    category: p?.category?.replace('_', ' ') || '',
                    type: p?.type || ''
                }
            })

            const rowsHtml = registeredPrograms.map(p => `
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">${p.name}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${p.category}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${p.type}</td>
                </tr>
            `).join('')

            const dashboardUrl = `${process.env.NEXTAUTH_URL || ''}/dashboard`

            const htmlContent = `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e1e1e1; border-radius: 12px; color: #333;">
                    <div style="text-align: center; margin-bottom: 25px;">
                        <h1 style="color: #8b0000; margin: 0; font-size: 28px;">Registration Confirmed!</h1>
                        <p style="color: #666; font-size: 16px;">${festivalName}</p>
                    </div>
                    
                    <p>Hello <strong>${user.fullName}</strong>,</p>
                    <p>Success! Your registration for the following programs has been confirmed. We're excited to see you perform!</p>
                    
                    <div style="margin: 25px 0;">
                        <table style="width: 100%; border-collapse: collapse; background-color: #fff;">
                            <thead>
                                <tr style="background-color: #8b0000; color: white;">
                                    <th style="padding: 12px; border: 1px solid #8b0000; text-align: left;">Program</th>
                                    <th style="padding: 12px; border: 1px solid #8b0000; text-align: left;">Category</th>
                                    <th style="padding: 12px; border: 1px solid #8b0000; text-align: left;">Type</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>
                    
                    <p style="line-height: 1.6;">You can view your full registration schedule, team details, and download your registration slip directly from your dashboard.</p>
                    
                    <div style="text-align: center; margin-top: 35px;">
                        <a href="${dashboardUrl}" style="background-color: #8b0000; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(139, 0, 0, 0.2);">Go to My Dashboard</a>
                    </div>
                    
                    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888; text-align: center;">
                        <p>This is an automated confirmation of your registrations.</p>
                        <p>&copy; ${new Date().getFullYear()} ${festivalName} Organizing Committee</p>
                    </div>
                </div>
            `

            await sendEmail({
                to: user.email,
                subject: `Registration Confirmed: ${festivalName}`,
                text: `Hello ${user.fullName}, your registration for the programs in ${festivalName} has been confirmed. View details on your dashboard.`,
                html: htmlContent,
                smtpConfig: smtpConfigObj.user ? smtpConfigObj : undefined
            })
        } catch (emailErr) {
            console.error('Failed to send registration confirmation email:', emailErr)
            // We don't fail the registration if only the email fails
        }

        return { success: true }
    } catch (e: any) {
        console.error('Batch registration failed:', e)
        return { success: false, error: e.message || 'Batch registration failed' }
    }
}
