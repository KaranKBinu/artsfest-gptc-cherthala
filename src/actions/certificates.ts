'use server'

import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/mail'
import { revalidatePath } from 'next/cache'
import fs from 'fs/promises'
import path from 'path'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'

export async function generateAndSendCertificates(registrationIds: string[]) {
    try {
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
            // Priority 1: Fetch from Google Fonts (TTF) - Most reliable for pdf-lib
            try {
                const response = await fetch('https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansMalayalam/NotoSansMalayalam-Regular.ttf');
                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    malayalamFontBytes = Buffer.from(arrayBuffer);
                }
            } catch (err) {
                console.warn('Failed to fetch font from URL, trying local files...', err);
            }

            // Priority 2: Public folder (if download worked previously)
            if (!malayalamFontBytes) {
                try {
                    const publicPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansMalayalam-Regular.ttf')
                    malayalamFontBytes = await fs.readFile(publicPath)
                } catch { } // Ignore
            }

            // Priority 3: node_modules (WOFF - might fail with some versions of fontkit but worth a shot)
            if (!malayalamFontBytes) {
                try {
                    const nmPath = path.join(process.cwd(), 'node_modules', '@fontsource', 'noto-sans-malayalam', 'files', 'noto-sans-malayalam-malayalam-400-normal.woff')
                    malayalamFontBytes = await fs.readFile(nmPath)
                } catch { } // Ignore
            }
        } catch (e) {
            console.warn('Malayalam font loading completely failed:', e)
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
        const drawCenteredText = (page: any, text: string, y: number, font: any, size: number, color: any) => {
            const textWidth = font.widthOfTextAtSize(text, size)
            const x = (page.getWidth() - textWidth) / 2
            page.drawText(text, { x, y, size, font, color })
        }

        for (const reg of registrations) {
            try {
                const pdfDoc = await PDFDocument.create()
                pdfDoc.registerFontkit(fontkit)

                const page = pdfDoc.addPage([841.89, 595.28]) // A4 Landscape (approx)
                const { width, height } = page.getSize()

                // Fonts
                const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman)
                const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
                const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic)
                let customFont = timesBold;

                if (malayalamFontBytes) {
                    try {
                        customFont = await pdfDoc.embedFont(malayalamFontBytes)
                    } catch (e) {
                        console.error('Failed to embed custom font', e)
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
                            // Simple header check for PNG vs JPG
                            if (imgBytes[0] === 0x89 && imgBytes[1] === 0x50 && imgBytes[2] === 0x4E && imgBytes[3] === 0x47) {
                                image = await pdfDoc.embedPng(imgBytes)
                            } else {
                                image = await pdfDoc.embedJpg(imgBytes)
                            }
                            page.drawImage(image, { x: 0, y: 0, width, height })
                        }
                    } catch (e) {
                        console.error('Failed to embed background image', e)
                        // Fallback border
                        page.drawRectangle({ x: 14, y: 14, width: width - 28, height: height - 28, borderColor: rgb(0.7, 0.6, 0.2), borderWidth: 3 })
                    }
                } else {
                    page.drawRectangle({ x: 28, y: 28, width: width - 56, height: height - 56, borderColor: rgb(0.7, 0.6, 0.2), borderWidth: 4 })
                }

                // Text Overlay
                // Y-coordinates converted from mm (from top) to points (from bottom)
                // Y_pdf = 595.28 - (Y_mm * 2.83465)

                // Title (40mm ~ 113pt -> 482)
                drawCenteredText(page, 'CERTIFICATE OF MERIT', 482, timesBold, 38, rgb(0.39, 0.08, 0.08))

                // Subtitle (60mm ~ 170pt -> 425)
                drawCenteredText(page, 'This is to certify that', 425, timesFont, 20, rgb(0.16, 0.16, 0.16))

                // Student Name (78mm ~ 221pt -> 374)
                drawCenteredText(page, reg.user.fullName.toUpperCase(), 374, timesBold, 32, rgb(0, 0, 0))

                // Achievement (92mm ~ 261pt -> 334)
                const grade = (reg as any).grade
                const achieveText = (grade && grade !== 'PARTICIPATION') ? `has secured ${grade.replace(/_/g, ' ')}` : 'has successfully participated'
                drawCenteredText(page, `${achieveText} in the event`, 334, timesFont, 18, rgb(0.16, 0.16, 0.16))

                // Program Name
                const progName = `${reg.program.name} (${reg.program.type})`
                if (customFont !== timesBold) {
                    try {
                        drawCenteredText(page, progName, 300, customFont, 22, rgb(0.59, 0.12, 0.12))
                    } catch (e) {
                        console.error('Failed to render program name with custom font', e)
                    }
                } else {
                    // Start checking for Malayalam characters
                    // Unicode range for Malayalam is 0D00–0D7F
                    const hasMalayalam = /[\u0D00-\u0D7F]/.test(progName);
                    if (!hasMalayalam) {
                        drawCenteredText(page, progName, 300, timesBold, 22, rgb(0.59, 0.12, 0.12))
                    } else {
                        console.warn('Skipping program name rendering: Malayalam characters present but custom font failed to load.')
                    }
                }

                // Festival (116mm ~ 329pt -> 266)
                drawCenteredText(page, `conducted as part of ${festivalName}`, 266, timesItalic, 16, rgb(0.24, 0.24, 0.24))

                // Date (128mm ~ 363pt -> 232)
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
                    console.error(`Email failed for ${reg.user.email}:`, emailRes.error)
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
