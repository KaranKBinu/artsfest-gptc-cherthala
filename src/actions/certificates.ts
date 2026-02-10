'use server'

import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/mail'
import { revalidatePath } from 'next/cache'
import fs from 'fs/promises'
import path from 'path'
import puppeteer from 'puppeteer'

/**
 * Generate certificate using Puppeteer - Full Unicode/Malayalam support
 * This approach renders HTML/CSS to PDF using Chrome's rendering engine
 */
async function generateCertificatePDF(options: {
    templatePath: string
    studentName: string
    programName: string
    grade?: string
    festivalName: string
}): Promise<Buffer> {
    const { templatePath, studentName, programName, grade, festivalName } = options

    // Read template as base64 for embedding in HTML
    const templateBuffer = await fs.readFile(templatePath)
    const templateBase64 = templateBuffer.toString('base64')
    const templateMimeType = templatePath.endsWith('.png') ? 'image/png' : 'image/jpeg'

    const achieveText = (grade && grade !== 'PARTICIPATION')
        ? `has secured ${grade.replace(/_/g, ' ')}`
        : 'has successfully participated'

    const dateStr = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    })

    // Create HTML with embedded CSS and content - Full Unicode support
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Malayalam:wght@400;700&family=Noto+Serif:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                width: 297mm;
                height: 210mm;
                margin: 0;
                padding: 0;
                position: relative;
            }
            .certificate {
                width: 297mm;
                height: 210mm;
                position: relative;
                background-image: url('data:${templateMimeType};base64,${templateBase64}');
                background-size: cover;
                background-position: center;
                font-family: 'Noto Serif', serif;
            }
            .content {
                position: absolute;
                width: 100%;
                text-align: center;
                color: #000;
            }
            .title {
                top: 48mm;
                font-size: 38px;
                font-weight: bold;
                color: #641414;
                font-family: 'Noto Serif', serif;
            }
            .subtitle {
                top: 65mm;
                font-size: 20px;
                color: #292929;
            }
            .student-name {
                top: 80mm;
                font-size: 32px;
                font-weight: bold;
                color: #000;
                text-transform: uppercase;
            }
            .achievement {
                top: 95mm;
                font-size: 18px;
                color: #292929;
            }
            .program-name {
                top: 108mm;
                font-size: 22px;
                font-weight: bold;
                color: #971F1F;
                font-family: 'Noto Sans Malayalam', 'Noto Serif', serif;
            }
            .festival {
                top: 122mm;
                font-size: 16px;
                font-style: italic;
                color: #3D3D3D;
            }
            .date {
                top: 135mm;
                font-size: 13px;
                color: #000;
            }
        </style>
    </head>
    <body>
        <div class="certificate">
            <div class="content title">CERTIFICATE OF MERIT</div>
            <div class="content subtitle">This is to certify that</div>
            <div class="content student-name">${studentName}</div>
            <div class="content achievement">${achieveText} in the event</div>
            <div class="content program-name">${programName}</div>
            <div class="content festival">conducted as part of ${festivalName}</div>
            <div class="content date">Dated: ${dateStr}</div>
        </div>
    </body>
    </html>
    `

    // Launch browser and generate PDF
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    try {
        const page = await browser.newPage()
        await page.setContent(html, { waitUntil: 'networkidle0' })

        // Wait for fonts to load
        await page.evaluateHandle('document.fonts.ready')

        const pdfBytes = await page.pdf({
            width: '297mm',
            height: '210mm',
            printBackground: true,
            preferCSSPageSize: true
        })

        return Buffer.from(pdfBytes)
    } finally {
        await browser.close()
    }
}

/**
 * Production certificate generation with Puppeteer
 */
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

        // 2. Fetch Configs
        const configs = await prisma.configuration.findMany({
            where: { key: { in: ['certificateTemplate', 'smtpConfig', 'festivalName'] } }
        })

        const templateVal = configs.find(c => c.key === 'certificateTemplate')?.value || ''
        const smtpStr = configs.find(c => c.key === 'smtpConfig')?.value || '{}'
        const festivalName = configs.find(c => c.key === 'festivalName')?.value || 'ArtsFest GPTC'

        let smtpConfigObj: any = {}
        try { smtpConfigObj = JSON.parse(smtpStr) } catch (e) { }

        // Validate template configuration
        if (!templateVal) {
            return { success: false, error: 'Certificate template not configured. Please upload a template in Configuration settings.' }
        }

        // Get template path or URL
        let templatePath: string
        let templateBuffer: Buffer | null = null

        if (templateVal.startsWith('/uploads/') || templateVal.startsWith('/test/')) {
            // Local file in public directory
            templatePath = path.join(process.cwd(), 'public', templateVal)
            console.log('Using local template:', templatePath)
        } else if (templateVal.startsWith('http://') || templateVal.startsWith('https://')) {
            // Remote URL (including Vercel Blob Storage)
            console.log('Fetching template from URL:', templateVal)
            try {
                const res = await fetch(templateVal)
                if (!res.ok) {
                    throw new Error(`Failed to fetch template: ${res.status} ${res.statusText}`)
                }
                templateBuffer = Buffer.from(await res.arrayBuffer())
                // Save temporarily for Puppeteer to access
                templatePath = path.join(process.cwd(), 'public', 'temp-cert-template.png')
                await fs.writeFile(templatePath, templateBuffer)
                console.log('Template downloaded and saved temporarily')
            } catch (error: any) {
                console.error('Error fetching template from blob storage:', error)
                return { success: false, error: `Failed to fetch certificate template: ${error.message}` }
            }
        } else {
            return { success: false, error: 'Invalid template configuration. Please configure a valid template URL or path.' }
        }

        let successCount = 0
        let failCount = 0

        for (const reg of registrations) {
            try {
                console.log(`Generating certificate for ${reg.user.fullName}...`)

                const pdfBuffer = await generateCertificatePDF({
                    templatePath,
                    studentName: reg.user.fullName,
                    programName: `${reg.program.name} (${reg.program.type})`,
                    grade: (reg as any).grade,
                    festivalName
                })

                // Send Email
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

        // Cleanup temporary template file if it was downloaded
        if (templateBuffer) {
            try {
                await fs.unlink(templatePath)
                console.log('Temporary template file cleaned up')
            } catch (cleanupError) {
                console.warn('Failed to cleanup temporary template file:', cleanupError)
            }
        }

        revalidatePath('/dashboard')
        return { success: true, message: `Processed ${registrations.length}. ${successCount} sent, ${failCount} failed.` }
    } catch (error: any) {
        console.error('Certificate generation failed:', error)
        return { success: false, error: error?.message || 'Processing failed' }
    }
}
