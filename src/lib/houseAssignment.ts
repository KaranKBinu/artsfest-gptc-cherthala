import { prisma } from './prisma'
import { Gender } from '@prisma/client'

// House mapping based on the provided algorithm
// houseId 1: Kochery, 2: Narachi, 3: Gadwal, 4: Nirappel, 5: Mahishmathi
const HOUSE_MAPPING: Record<string, Record<string, number>> = {
    MALE: {
        'CT1': 1, 'CHE2': 1, 'ME3': 1,
        'CHE1': 2, 'IE2': 2, 'EC3': 2,
        'ME1': 3, 'EC2': 3, 'CT3': 3,
        'IE1': 4, 'CT2': 4, 'CHE3': 4,
        'EC1': 5, 'ME2': 5, 'IE3': 5
    },
    FEMALE: {
        'CT1': 1,
        'CT2': 2, 'ME1': 2, 'ME2': 2, 'IE2': 2,
        'CT3': 3, 'CHE1': 3,
        'EC3': 4, 'CHE2': 4,
        'CHE3': 5, 'EC2': 5, 'IE3': 5
    }
}

/**
 * Assign a house to a student based on gender, department, and semester
 */
export async function assignHouse(
    gender: Gender,
    department?: string,
    semester?: string
): Promise<string> {
    // Get all houses in the order they were seeded
    const houses = await prisma.house.findMany({
        orderBy: { createdAt: 'asc' }
    })

    if (houses.length === 0) {
        throw new Error('No houses available. Please create houses first.')
    }

    // Prepare the group code (e.g., CT1, CHE2)
    // Assuming semester is 1, 2, or 3
    const groupCode = `${department}${semester}`

    let houseIndex = -1

    if (gender === Gender.MALE) {
        houseIndex = HOUSE_MAPPING.MALE[groupCode] || -1
    } else if (gender === Gender.FEMALE) {
        houseIndex = HOUSE_MAPPING.FEMALE[groupCode] || -1
    }

    // If we have a direct mapping, use it
    if (houseIndex !== -1 && houses[houseIndex - 1]) {
        return houses[houseIndex - 1].id
    }

    // Fallback: If no mapping found (e.g., OTHER gender or unknown group), 
    // use balanced distribution among all houses
    const housesWithCounts = await prisma.house.findMany({
        include: {
            _count: {
                select: { users: true },
            },
        },
    })

    const sortedHouses = housesWithCounts.sort((a, b) => {
        return a._count.users - b._count.users
    })

    return sortedHouses[0].id
}

/**
 * Get house distribution statistics
 */
export async function getHouseStats() {
    const houses = await prisma.house.findMany({
        include: {
            _count: {
                select: { users: true },
            },
            users: {
                select: {
                    department: true,
                    semester: true,
                    gender: true,
                },
            },
        },
    })

    return houses.map(house => {
        const departmentCounts: Record<string, number> = {}
        const semesterCounts: Record<string, number> = {}
        const genderCounts: Record<string, number> = {}

        house.users.forEach(user => {
            if (user.department) {
                departmentCounts[user.department] = (departmentCounts[user.department] || 0) + 1
            }
            if (user.semester) {
                semesterCounts[user.semester] = (semesterCounts[user.semester] || 0) + 1
            }
            genderCounts[user.gender] = (genderCounts[user.gender] || 0) + 1
        })

        return {
            id: house.id,
            name: house.name,
            totalMembers: house._count.users,
            departmentDistribution: departmentCounts,
            semesterDistribution: semesterCounts,
            genderDistribution: genderCounts,
        }
    })
}
