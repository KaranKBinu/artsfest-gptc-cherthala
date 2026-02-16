import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

// This data was backed up from the live database on 2026-02-15
const backupData = {
    "houses": [
        { "name": "കോച്ചേരി", "color": "#4A90E2", "description": "Kochery House" },
        { "name": "നറാച്ചി", "color": "#F5A623", "description": "Narachi House" },
        { "name": "ഗദ്വാൾ", "color": "#7ED321", "description": "Gadwal House" },
        { "name": "നിരപ്പേൽ", "color": "#9013FE", "description": "Nirappel House" },
        { "name": "മഹിഷ്മതി", "color": "#D0021B", "description": "Mahishmathi House" }
    ],
    "configs": [
        { "key": "maxOnStageSolo", "value": "4", "description": "Max individual on-stage programs" },
        { "key": "maxOnStageGroup", "value": "2", "description": "Max group on-stage programs" },
        { "key": "maxOffStageTotal", "value": "3", "description": "Max total off-stage items" },
        { "key": "minAttendanceForCertificate", "value": "1", "description": "Min attendance for cert" },
        { "key": "festivalName", "value": "ArtsFest GPTC Cherthala", "description": "Festival Name" },
        { "key": "festivalYear", "value": "2026", "description": "Festival Year" },
        { "key": "departments", "value": "[{\"code\":\"CHE\",\"name\":\"Computer Hardware Engineering\"},{\"code\":\"CT\",\"name\":\"Computer Engineering\"},{\"code\":\"ME\",\"name\":\"Mechanical Engineering\"},{\"code\":\"IE\",\"name\":\"Instrumentation Engineering\"},{\"code\":\"EC\",\"name\":\"Electronics & Communication\"}]", "description": "List of departments" },
        { "key": "galleryText", "value": "Moments of Creativity", "description": "Gallery text" },
        { "key": "galleryImages", "value": "[]", "description": "Gallery image URLs" },
        { "key": "smtpConfig", "value": "{\"host\":\"smtp.gmail.com\",\"port\":587,\"user\":\"opensourceitems@gmail.com\",\"pass\":\"ljiw culz viye nvew\",\"secure\":false}", "description": "SMTP settings (JSON)" },
        { "key": "certificateTemplate", "value": "https://scdbgn1j4wxj2rnq.public.blob.vercel-storage.com/Cream%20Beige%20Aesthetic%20Elegant%20Completion%20Certificate-WAGfv0LmUY0SIQ01YNzsAW6gC6PTw9.png", "description": "Certificate template URL" },
        { "key": "artsFestManual", "value": "https://scdbgn1j4wxj2rnq.public.blob.vercel-storage.com/kalolsavamanual-1OGcjEW9BK3trfe8XZX5bzPN3PdHac.pdf", "description": "" },
        { "key": "contactInfo", "value": "{\"title\":\"Contact Us\",\"email\":\"karankbinu799@gmail.com\",\"phone\":\"+91 7994667412\",\"address\":\"GPTC Cherthala, Alappuzha\"}", "description": "" },
        { "key": "notifications", "value": "[{\"id\":1,\"title\":\"Welcome to ArtsFest 2024\",\"message\":\"ArtsFest Manual is available for all students.\",\"type\":\"info\",\"date\":\"2026-02-15T08:21:59.800Z\"}]", "description": "Site notifications" },
        { "key": "teamMembers", "value": "[{\"name\":\"Karan K Binu\",\"role\":\"Lead Developer\",\"email\":\"karankbinu799@gmail.com\",\"photo\":\"https://scdbgn1j4wxj2rnq.public.blob.vercel-storage.com/1000318066-dYW8Ko52JUKf1GJq7tXt3DwO7FZFHf.webp\"},{\"name\":\"Devadathan A S\",\"role\":\"Support Engineer\",\"email\":\"devadethanas11@gmail.com\",\"photo\":\"https://scdbgn1j4wxj2rnq.public.blob.vercel-storage.com/1000516128-cxPREarcwyZoFCiAdbL1n4ASFwpn0f.jpg\"},{\"name\":\"Abishek vineesh\",\"role\":\"Support Engineer \",\"email\":\"aabhishek3223@gmail.com\",\"photo\":\"https://scdbgn1j4wxj2rnq.public.blob.vercel-storage.com/1000518698-BmZZR7nde47hpvtYZsj9u51tMoF8Cu.jpg\"},{\"name\":\"SABARINATH J S\",\"role\":\"Support Engineer \",\"email\":\"sabarinathjs543@gmail.com\",\"photo\":\"https://scdbgn1j4wxj2rnq.public.blob.vercel-storage.com/1000518699-Mu3IK3KKsqCAtFllHOX3PMWhpKOnko.jpg\"},{\"name\":\"Saday Jayaraj .R\",\"role\":\"Support Engineer \",\"email\":\"sadayjayaraj@gmail.com\",\"photo\":\"https://scdbgn1j4wxj2rnq.public.blob.vercel-storage.com/1000518727-YjChss6eUAxJooSdsgJJjH4U1wEztB.jpg\"}]", "description": "" },
        { "key": "showScoreboard", "value": "true", "description": "Show house leaderboard on home page" },
        { "key": "appFavicon", "value": "/favicon.png", "description": "Application favicon URL" },
        { "key": "appLogo", "value": "/favicon.png", "description": "Application logo URL used in Navbar" }
    ],
    "programs": [
        { "name": "ശാസ്ത്രീയ സംഗീതം", "type": "SOLO", "category": "ON_STAGE", "minMembers": 1, "maxMembers": 1 },
        { "name": "ലളിത ഗാനം", "type": "SOLO", "category": "ON_STAGE", "minMembers": 1, "maxMembers": 1 },
        { "name": "മാപ്പിളപ്പാട്ട്", "type": "SOLO", "category": "ON_STAGE", "minMembers": 1, "maxMembers": 1 },
        { "name": "കഥകളി", "type": "SOLO", "category": "ON_STAGE", "minMembers": 1, "maxMembers": 1 },
        { "name": "നാടോടി നൃത്തം", "type": "SOLO", "category": "ON_STAGE", "minMembers": 1, "maxMembers": 1 },
        { "name": "ഭരതനാട്യം", "type": "SOLO", "category": "ON_STAGE", "minMembers": 1, "maxMembers": 1 },
        { "name": "കുച്ചുപ്പുടി", "type": "SOLO", "category": "ON_STAGE", "minMembers": 1, "maxMembers": 1 },
        { "name": "ചാക്യാർകൂത്ത്", "type": "SOLO", "category": "ON_STAGE", "minMembers": 1, "maxMembers": 1 },
        { "name": "മോഹിനിയാട്ടം", "type": "SOLO", "category": "ON_STAGE", "minMembers": 1, "maxMembers": 1 },
        { "name": "പദ്യം ചൊല്ലൽ", "type": "SOLO", "category": "ON_STAGE", "minMembers": 1, "maxMembers": 1 },
        { "name": "മോണോ ആക്ട്", "type": "SOLO", "category": "ON_STAGE", "minMembers": 1, "maxMembers": 1 },
        { "name": "മിമിക്രി ആക്ട്", "type": "SOLO", "category": "ON_STAGE", "minMembers": 1, "maxMembers": 1 },
        { "name": "വയലിൻ", "type": "SOLO", "category": "ON_STAGE", "minMembers": 1, "maxMembers": 1 },
        { "name": "ഗിറ്റാർ", "type": "SOLO", "category": "ON_STAGE", "minMembers": 1, "maxMembers": 1 },
        { "name": "ഓടക്കുഴൽ", "type": "SOLO", "category": "ON_STAGE", "minMembers": 1, "maxMembers": 1 },
        { "name": "മൃദംഗം", "type": "SOLO", "category": "ON_STAGE", "minMembers": 1, "maxMembers": 1 },
        { "name": "സംഘനൃത്തം", "type": "GROUP", "category": "ON_STAGE", "minMembers": 2, "maxMembers": 20 },
        { "name": "തിരുവാതിര", "type": "GROUP", "category": "ON_STAGE", "minMembers": 2, "maxMembers": 20 },
        { "name": "മാർഗംകളി", "type": "GROUP", "category": "ON_STAGE", "minMembers": 2, "maxMembers": 20 },
        { "name": "ഒപ്പന", "type": "GROUP", "category": "ON_STAGE", "minMembers": 2, "maxMembers": 20 },
        { "name": "വട്ടപ്പാട്ട്", "type": "GROUP", "category": "ON_STAGE", "minMembers": 2, "maxMembers": 20 },
        { "name": "സംഘഗാനം", "type": "GROUP", "category": "ON_STAGE", "minMembers": 2, "maxMembers": 20 },
        { "name": "ഗാനമേള", "type": "GROUP", "category": "ON_STAGE", "minMembers": 2, "maxMembers": 20 },
        { "name": "നാടകം", "type": "GROUP", "category": "ON_STAGE", "minMembers": 2, "maxMembers": 20 },
        { "name": "മുകാഭിനയം", "type": "GROUP", "category": "ON_STAGE", "minMembers": 2, "maxMembers": 20 },
        { "name": "ചെണ്ടമേളം", "type": "GROUP", "category": "ON_STAGE", "minMembers": 2, "maxMembers": 20 },
        { "name": "വൃന്ദാവാദ്യം", "type": "GROUP", "category": "ON_STAGE", "minMembers": 2, "maxMembers": 20 },
        { "name": "പഞ്ചവാദ്യം", "type": "GROUP", "category": "ON_STAGE", "minMembers": 2, "maxMembers": 20 },
        { "name": "നാടൻപാട്ട്", "type": "GROUP", "category": "ON_STAGE", "minMembers": 2, "maxMembers": 20 },
        { "name": "പരിചയമുട്ടുകളി", "type": "GROUP", "category": "ON_STAGE", "minMembers": 2, "maxMembers": 20 },
        { "name": "കോൽക്കളി", "type": "GROUP", "category": "ON_STAGE", "minMembers": 2, "maxMembers": 20 },
        { "name": "ദഫ്മുട്ട്", "type": "GROUP", "category": "ON_STAGE", "minMembers": 2, "maxMembers": 20 },
        { "name": "പൂരക്കളി", "type": "GROUP", "category": "ON_STAGE", "minMembers": 2, "maxMembers": 20 },
        { "name": "ചെണ്ട (തായമ്പക)", "type": "GROUP", "category": "ON_STAGE", "minMembers": 2, "maxMembers": 20 },
        { "name": "മദ്ദളം", "type": "GROUP", "category": "ON_STAGE", "minMembers": 2, "maxMembers": 20 },
        { "name": "തബല", "type": "GROUP", "category": "ON_STAGE", "minMembers": 2, "maxMembers": 20 },
        { "name": "ദേശഭക്തി ഗാനം", "type": "GROUP", "category": "ON_STAGE", "minMembers": 2, "maxMembers": 20 },
        { "name": "കഥാപ്രസംഗം", "type": "GROUP", "category": "ON_STAGE", "minMembers": 2, "maxMembers": 20 },
        { "name": "ചിത്രരചന - പെൻസിൽ", "type": "SOLO", "category": "ON_STAGE", "minMembers": 1, "maxMembers": 1 },
        { "name": "ഓട്ടൻതുള്ളൽ", "type": "SOLO", "category": "ON_STAGE", "minMembers": 1, "maxMembers": 1 }
    ]
}

async function main() {
    console.log('🏁 Starting Restore Seed (System Backup)...')

    // 1. Houses
    for (const h of backupData.houses) {
        await prisma.house.upsert({
            where: { name: h.name },
            update: { color: h.color, description: h.description },
            create: { id: crypto.randomUUID(), ...h }
        })
    }
    console.log('✅ Houses Restored')

    // 2. Configs
    for (const c of backupData.configs) {
        await prisma.configuration.upsert({
            where: { key: c.key },
            update: { value: c.value, description: c.description },
            create: { id: crypto.randomUUID(), ...c }
        })
    }
    console.log('✅ Configurations Restored')

    // 3. Programs
    for (const p of backupData.programs) {
        await prisma.program.upsert({
            where: { name: p.name },
            update: { type: p.type as any, category: p.category as any, minMembers: p.minMembers, maxMembers: p.maxMembers },
            create: { id: crypto.randomUUID(), ...p as any, isActive: true }
        })
    }
    console.log('✅ Programs Restored')

    console.log('🎉 Data Backup Seed completed successfully!')
}

main()
    .catch((e) => {
        console.error('❌ Error seeding from backup:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
