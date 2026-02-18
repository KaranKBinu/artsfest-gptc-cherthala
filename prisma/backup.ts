import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
    console.log('🚀 Starting Database Backup to JSON...')

    try {
        const backupData: any = {}

        // List of models to backup
        const models = [
            'attendance',
            'certificate',
            'configuration',
            'feedback',
            'groupMember',
            'house',
            'passwordReset',
            'program',
            'registration',
            'user'
        ]

        for (const model of models) {
            console.log(`📡 Fetching ${model}...`)
            // @ts-ignore - Dynamic model access
            backupData[model] = await prisma[model].findMany()
        }

        const backupPath = path.join(process.cwd(), 'db_backup.json')
        fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2))

        console.log(`✅ Backup completed successfully!`)
        console.log(`📄 Backup saved to: ${backupPath}`)
        console.log(`📊 Total records:`)
        for (const model of models) {
            console.log(`   - ${model}: ${backupData[model].length}`)
        }

    } catch (error) {
        console.error('❌ Backup failed:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
