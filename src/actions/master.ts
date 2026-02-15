'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

/**
 * Check if the current user is a MASTER user
 */
async function checkMaster() {
    const token = cookies().get('token')?.value
    if (!token) throw new Error('Unauthorized: No token found')

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'MASTER') {
        throw new Error('Unauthorized: Insufficient permissions')
    }
    return payload
}

/**
 * Get all models and their schemas
 */
export async function getMasterModels() {
    try {
        await checkMaster()
        // @ts-ignore - Prisma.dmmf is internal but available on server
        const dmmf = Prisma.dmmf.datamodel
        return {
            success: true,
            data: {
                models: dmmf.models,
                enums: dmmf.enums
            }
        }
    } catch (error: any) {
        console.error('getMasterModels error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Get data for a specific model
 */
export async function getMasterTableData(modelName: string, params: {
    page?: number
    limit?: number
    orderBy?: string
    orderDir?: 'asc' | 'desc'
    where?: any
} = {}) {
    try {
        await checkMaster()
        const { page = 1, limit = 50, orderBy, orderDir = 'desc', where = {} } = params
        const skip = (page - 1) * limit

        const prismaModel = (prisma as any)[modelName[0].toLowerCase() + modelName.slice(1)]
        if (!prismaModel) throw new Error(`Model ${modelName} not found`)

        const [items, total] = await Promise.all([
            prismaModel.findMany({
                where,
                skip,
                take: limit,
                orderBy: orderBy ? { [orderBy]: orderDir } : undefined,
            }),
            prismaModel.count({ where })
        ])

        return {
            success: true,
            data: {
                items,
                total,
                page,
                limit
            }
        }
    } catch (error: any) {
        console.error(`getMasterTableData error for ${modelName}:`, error)
        return { success: false, error: error.message }
    }
}

/**
 * Create a new record in a table
 */
export async function createMasterRecord(modelName: string, data: any) {
    try {
        await checkMaster()
        const prismaModel = (prisma as any)[modelName[0].toLowerCase() + modelName.slice(1)]
        if (!prismaModel) throw new Error(`Model ${modelName} not found`)

        // Clean up data - remove empty strings for optional fields if necessary
        // or handle specific types based on schema

        const record = await prismaModel.create({ data })
        revalidatePath('/dashboard/master/database')
        return { success: true, data: record }
    } catch (error: any) {
        console.error(`createMasterRecord error for ${modelName}:`, error)
        return { success: false, error: error.message }
    }
}

/**
 * Update an existing record
 */
export async function updateMasterRecord(modelName: string, id: string, data: any) {
    try {
        await checkMaster()
        const prismaModel = (prisma as any)[modelName[0].toLowerCase() + modelName.slice(1)]
        if (!prismaModel) throw new Error(`Model ${modelName} not found`)

        const record = await prismaModel.update({
            where: { id },
            data
        })
        revalidatePath('/dashboard/master/database')
        return { success: true, data: record }
    } catch (error: any) {
        console.error(`updateMasterRecord error for ${modelName}:`, error)
        return { success: false, error: error.message }
    }
}

/**
 * Delete a record
 */
export async function deleteMasterRecord(modelName: string, id: string) {
    try {
        await checkMaster()
        const prismaModel = (prisma as any)[modelName[0].toLowerCase() + modelName.slice(1)]
        if (!prismaModel) throw new Error(`Model ${modelName} not found`)

        await prismaModel.delete({
            where: { id }
        })
        revalidatePath('/dashboard/master/database')
        return { success: true }
    } catch (error: any) {
        console.error(`deleteMasterRecord error for ${modelName}:`, error)
        return { success: false, error: error.message }
    }
}

/**
 * Export table data as CSV (returns the data, formatting happens on client)
 */
export async function getExportData(modelName: string) {
    try {
        await checkMaster()
        const prismaModel = (prisma as any)[modelName[0].toLowerCase() + modelName.slice(1)]
        if (!prismaModel) throw new Error(`Model ${modelName} not found`)

        const items = await prismaModel.findMany()
        return { success: true, data: items }
    } catch (error: any) {
        console.error(`getExportData error for ${modelName}:`, error)
        return { success: false, error: error.message }
    }
}
