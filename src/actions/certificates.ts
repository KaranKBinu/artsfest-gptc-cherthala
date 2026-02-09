'use server'

import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/mail'
import { revalidatePath } from 'next/cache'
import fs from 'fs/promises'
import path from 'path'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { MALAYALAM_FONT_BASE64 } from '@/lib/malayalam-font'

export async function generateAndSendCertificates(registrationIds: string[]) {
    try {
        const registrations = await prisma.registration.findMany({
            where: {
                id: { in: registrationIds },
                attendances: { some: { isPresent: true } }
            },
            include: { user: true, program: true }
        })

        if (registrations.length === 0) {
            return { success: false, error: 'No eligible registrations found' }
        }

        const configs = await prisma.configuration.findMany({
            where: { key: { in: ['certificateTemplate', 'smtpConfig', 'festivalName'] } }
        })

        const templateVal = configs.find(c => c.key === 'certificateTemplate')?.value || ''
        const smtpStr = configs.find(c => c.key === 'smtpConfig')?.value || '{}'
        const festivalName = configs.find(c => c.key === 'festivalName')?.value || 'ArtsFest GPTC'

        let smtpConfigObj: any = {}
        try { smtpConfigObj = JSON.parse(smtpStr) } catch (e) { }

        let successCount = 0
        let failCount = 0

        for (const reg of registrations) {
            try {
                const pdfDoc = await PDFDocument.create()
                pdfDoc.registerFontkit(fontkit)

                const page = pdfDoc.addPage([841.89, 595.28])
                const { width, height } = page.getSize()

                // Load fonts
                const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman)
                const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
                const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic)
                
                let malayalamFont = timesBold
                try {
                    console.log('Starting certificate generation script...')
                    const fontBytes = Buffer.from(MALAYALAM_FONT_BASE64, 'base64')
                    console.log('Fontkit registered successfully')
                    malayalamFont = await pdfDoc.embedFont(fontBytes)
                    console.log('Malayalam font embedded successfully')
                } catch (e) {
                    console.error('✗ Malayalam font loading error:', e)
                    console.warn('NO Malayalam font bytes available to embed')
                }

                // Background
                if (templateVal) {
                    try {
                        let imgBytes: Buffer | undefined
                        if (templateVal.startsWith('/uploads/')) {
                            imgBytes = await fs.readFile(path.join(process.cwd(), 'public', templateVal))
                        } else if (templateVal.startsWith('http')) {
                            const res = await fetch(templateVal)
                            imgBytes = Buffer.from(await res.arrayBuffer())
                        }

                        if (imgBytes) {
                            const image = imgBytes[0] === 0x89 && imgBytes[1] === 0x50 
                                ? await pdfDoc.embedPng(imgBytes)
                                : await pdfDoc.embedJpg(imgBytes)
                            page.drawImage(image, { x: 0, y: 0, width, height })
                        }
                    } catch (e) {
                        page.drawRectangle({ x: 14, y: 14, width: width - 28, height: height - 28, borderColor: rgb(0.7, 0.6, 0.2), borderWidth: 3 })
                    }
                } else {
                    page.drawRectangle({ x: 28, y: 28, width: width - 56, height: height - 56, borderColor: rgb(0.7, 0.6, 0.2), borderWidth: 4 })
                }

                const drawCentered = (text: string, y: number, font: any, size: number, color: any) => {
                    try {
                        const w = font.widthOfTextAtSize(text, size)
                        page.drawText(text, { x: (width - w) / 2, y, size, font, color })
                    } catch (e) {
                        // Fallback for fonts that don't support widthOfTextAtSize
                        const estimatedWidth = text.length * size * 0.6
                        page.drawText(text, { x: (width - estimatedWidth) / 2, y, size, font, color })
                    }
                }

                // Content
                drawCentered('CERTIFICATE OF MERIT', 482, timesBold, 38, rgb(0.39, 0.08, 0.08))
                drawCentered('This is to certify that', 425, timesFont, 20, rgb(0.16, 0.16, 0.16))
                drawCentered(reg.user.fullName.toUpperCase(), 374, timesBold, 32, rgb(0, 0, 0))

                const grade = (reg as any).grade
                const achieveText = (grade && grade !== 'PARTICIPATION') ? `has secured ${grade.replace(/_/g, ' ')}` : 'has successfully participated'
                drawCentered(`${achieveText} in the event`, 334, timesFont, 18, rgb(0.16, 0.16, 0.16))

                // Program name with Malayalam support
                const progName = `${reg.program.name} (${reg.program.type})`
                const hasMalayalam = /[\u0D00-\u0D7F]/.test(progName)
                
                if (hasMalayalam) {
                    // For Malayalam text, use transliteration or English fallback
                    const englishName = reg.program.name.replace(/[\u0D00-\u0D7F]/g, '').trim() || reg.program.name
                    const displayName = `${englishName} (${reg.program.type})`
                    drawCentered(displayName, 300, timesBold, 24, rgb(0.59, 0.12, 0.12))
                } else {
                    drawCentered(progName, 300, timesBold, 24, rgb(0.59, 0.12, 0.12))
                }

                drawCentered(`conducted as part of ${festivalName}`, 266, timesItalic, 16, rgb(0.24, 0.24, 0.24))
                const dateStr = `Dated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`
                drawCentered(dateStr, 232, timesFont, 13, rgb(0, 0, 0))

                const pdfBytes = await pdfDoc.save()
                const pdfBuffer = Buffer.from(pdfBytes)

                const emailRes = await sendEmail({
                    to: reg.user.email,
                    subject: `Certificate for ${reg.program.name} - ${festivalName}`,
                    text: `Hello ${reg.user.fullName},\n\nCongratulations! Please find your certificate for ${reg.program.name} attached.\n\nBest regards,\n${festivalName} Committee`,
                    attachments: [{
                        filename: `Certificate_${reg.user.fullName.replace(/\s+/g, '_')}_${reg.program.name.replace(/\s+/g, '_')}.pdf`,
                        content: pdfBuffer
                    }],
                    smtpConfig: smtpConfigObj.user ? smtpConfigObj : undefined
                })

                if (emailRes.success) {
                    successCount++
                    await prisma.certificate.create({
                        data: {
                            userId: reg.userId,
                            registrationId: reg.id,
                            type: (reg as any).grade && (reg as any).grade !== 'PARTICIPATION' ? 'GRADE' : 'PARTICIPATION',
                            grade: (reg as any).grade,
                            emailSent: true
                        }
                    })
                } else {
                    failCount++
                }
            } catch (err) {
                console.error(`Failed for ${reg.user.fullName}:`, err)
                failCount++
            }
        }

        revalidatePath('/dashboard')
        return { success: true, message: `Processed ${registrations.length}. ${successCount} sent, ${failCount} failed.` }
    } catch (error) {
        console.error('Certificate generation failed:', error)
        return { success: false, error: 'Processing failed' }
    }
}
