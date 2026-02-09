'use server'

import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/mail'
import { revalidatePath } from 'next/cache'
import fs from 'fs/promises'
import path from 'path'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

import { MALAYALAM_FONT_B64 } from '@/lib/fonts'

export async function generateAndSendCertificates(registrationIds: string[]) {
    try {
        // Safe require for fontkit to avoid build issues
        let fontkit: any;
        try {
            fontkit = require('@pdf-lib/fontkit');
        } catch (e) {
            console.error('Failed to require fontkit', e);
        }

        // 1. Fetch Registrations
        const registrations = await prisma.registration.findMany({
            where: {
                id: { in: registrationIds },
                attendances: { some: { isPresent: true } }
            },
            include: { user: true, program: true }
        })

        if (registrations.length === 0) {
            return { success: false, error: 'No eligible registrations found (students must be present)' }
        }

        // 2. Load Fonts
        let malayalamFontBytes: Buffer | null = null
        try {
            // Priority 1: In-code Base64 (Reliable for Vercel)
            if (MALAYALAM_FONT_B64) {
                malayalamFontBytes = Buffer.from(MALAYALAM_FONT_B64, 'base64')
                console.log('Loaded Malayalam font from Base64 constants')
            }

            // Priority 2: Public folder (Local Dev)
            if (!malayalamFontBytes) {
                try {
                    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansMalayalam-Regular.ttf')
                    malayalamFontBytes = await fs.readFile(fontPath)
                    console.log('Successfully loaded Malayalam font from public/fonts')
                } catch (e) {
                    console.warn('Failed to load from public/fonts fallback')
                }
            }
        } catch (e) {
            console.error('Malayalam font loading error:', e)
        }

        // 3. Fetch Configs
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

        // Helper to draw centered text
        const drawCenteredText = (page: any, text: string, y: number, font: any, size: number, color: any, isUnicode = false) => {
            try {
                const textWidth = font.widthOfTextAtSize(text, size)
                const x = (page.getWidth() - textWidth) / 2
                page.drawText(text, { x, y, size, font, color })
            } catch (e: any) {
                console.warn(`Font error for "${text}":`, e.message);
                // If it fails and it's unicode, we can't do much with standard fonts, 
                // but let's at least not crash.
            }
        }

        for (const reg of registrations) {
            try {
                const pdfDoc = await PDFDocument.create()
                if (fontkit) {
                    pdfDoc.registerFontkit(fontkit.default || fontkit)
                }

                const page = pdfDoc.addPage([841.89, 595.28]) // A4 Landscape
                const { width, height } = page.getSize()

                // Fonts
                const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman)
                const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
                const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic)
                let customFont = timesBold;

                if (malayalamFontBytes && malayalamFontBytes.length > 1000) { // Ensure it's not a small error file
                    try {
                        customFont = await pdfDoc.embedFont(malayalamFontBytes)
                        console.log('Custom font embedded for', reg.user.fullName)
                    } catch (e) {
                        console.error('Failed to embed custom font:', e)
                    }
                }

                // Background Image
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
                            let image;
                            if (imgBytes[0] === 0x89 && imgBytes[1] === 0x50 && imgBytes[2] === 0x4E && imgBytes[3] === 0x47) {
                                image = await pdfDoc.embedPng(imgBytes)
                            } else {
                                image = await pdfDoc.embedJpg(imgBytes)
                            }
                            page.drawImage(image, { x: 0, y: 0, width, height })
                        }
                    } catch (e) {
                        console.error('Failed to embed background image', e)
                        page.drawRectangle({ x: 14, y: 14, width: width - 28, height: height - 28, borderColor: rgb(0.7, 0.6, 0.2), borderWidth: 3 })
                    }
                } else {
                    page.drawRectangle({ x: 28, y: 28, width: width - 56, height: height - 56, borderColor: rgb(0.7, 0.6, 0.2), borderWidth: 4 })
                }

                // Text Overlay
                drawCenteredText(page, 'CERTIFICATE OF MERIT', 482, timesBold, 38, rgb(0.39, 0.08, 0.08))
                drawCenteredText(page, 'This is to certify that', 425, timesFont, 20, rgb(0.16, 0.16, 0.16))
                drawCenteredText(page, reg.user.fullName.toUpperCase(), 374, timesBold, 32, rgb(0, 0, 0))

                const grade = (reg as any).grade
                const achieveText = (grade && grade !== 'PARTICIPATION') ? `has secured ${grade.replace(/_/g, ' ')}` : 'has successfully participated'
                drawCenteredText(page, `${achieveText} in the event`, 334, timesFont, 18, rgb(0.16, 0.16, 0.16))

                // Program Name
                const progName = `${reg.program.name} (${reg.program.type})`
                console.log('Rendering Program Name:', progName)

                // If the font is correctly embedded, pdf-lib + fontkit handles the Malayalam shaping
                drawCenteredText(page, progName, 300, customFont, 22, rgb(0.59, 0.12, 0.12))

                drawCenteredText(page, `conducted as part of ${festivalName}`, 266, timesItalic, 16, rgb(0.24, 0.24, 0.24))
                const dateStr = `Dated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`
                drawCenteredText(page, dateStr, 232, timesFont, 13, rgb(0, 0, 0))

                const pdfBytes = await pdfDoc.save()
                const pdfBuffer = Buffer.from(pdfBytes)

                // 4. Send Email
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
                console.error(`Failed to process cert for ${reg.user.fullName}:`, err)
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
