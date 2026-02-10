'use server'

import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/mail'
import { revalidatePath } from 'next/cache'
import fs from 'fs/promises'
import path from 'path'
import puppeteer from 'puppeteer-core'
// @ts-expect-error - Chromium types can be tricky in certain environments
import chromium from '@sparticuz/chromium'

/**
 * Generate certificate using Puppeteer - Full Unicode/Malayalam support
 * This approach renders HTML/CSS to PDF using Chrome's rendering engine
 */
async function generateCertificatePDF(options: {
    templateBuffer: Buffer
    templateMimeType: string
    studentName: string
    programName: string
    grade?: string
    points?: number
    festivalName: string
}): Promise<Buffer> {
    const { templateBuffer, templateMimeType, studentName, programName, grade, points, festivalName } = options

    // Convert template to base64 for embedding in HTML
    const templateBase64 = templateBuffer.toString('base64')

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
                font-family: 'Noto Sans Malayalam', 'Noto Serif', serif;
            }
            .date {
                top: 135mm;
                font-size: 13px;
                color: #000;
            }
            .points {
                top: 145mm;
                font-size: 14px;
                font-weight: bold;
                color: #555;
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
            ${points ? `<div class="content points">Grade Points: ${points}</div>` : ''}
        </div>
    </body>
    </html>
    `



    // Launch browser and generate PDF
    // Use @sparticuz/chromium for serverless (Vercel), fall back to local Chrome for development
    const isLocal = process.env.NODE_ENV === 'development' || !process.env.VERCEL

    console.log('[Certificate] Environment check:', { isLocal, NODE_ENV: process.env.NODE_ENV, VERCEL: process.env.VERCEL })

    // Configure chromium for Vercel (avoid brotli decompression)
    if (!isLocal) {
        chromium.setGraphicsMode = false
    }

    // Get executable path (@sparticuz/chromium.executablePath is a FUNCTION)
    const execPath = isLocal
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : await chromium.executablePath()  // Note: It's a function call, not a property

    console.log('[Certificate] Using executable path:', execPath)

    const browser = await puppeteer.launch({
        args: isLocal
            ? ['--no-sandbox', '--disable-setuid-sandbox']
            : [...chromium.args, '--disable-gpu'],
        defaultViewport: chromium.defaultViewport,
        executablePath: execPath,
        headless: true,
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

const CERT_SCORE_MAP: Record<string, number> = {
    'WINNER': 5,
    'FIRST_RUNNER_UP': 4,
    'SECOND_RUNNER_UP': 3,
    'PARTICIPATION': 2
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

        // Load template into buffer
        let templateBuffer: Buffer
        let templateMimeType: string

        if (templateVal.startsWith('/uploads/') || templateVal.startsWith('/test/')) {
            // Local file in public directory
            const templatePath = path.join(process.cwd(), 'public', templateVal)
            console.log('Loading local template:', templatePath)
            try {
                templateBuffer = await fs.readFile(templatePath)
                templateMimeType = templateVal.endsWith('.png') ? 'image/png' : 'image/jpeg'
                console.log('Local template loaded successfully')
            } catch (error: any) {
                console.error('Error reading local template:', error)
                return { success: false, error: `Failed to read local template: ${error.message}` }
            }
        } else if (templateVal.startsWith('http://') || templateVal.startsWith('https://')) {
            // Remote URL (including Vercel Blob Storage)
            console.log('Fetching template from URL:', templateVal)
            try {
                const res = await fetch(templateVal)
                if (!res.ok) {
                    throw new Error(`Failed to fetch template: ${res.status} ${res.statusText}`)
                }
                templateBuffer = Buffer.from(await res.arrayBuffer())
                // Determine mime type from URL or content-type header
                const contentType = res.headers.get('content-type')
                templateMimeType = contentType?.includes('png') ? 'image/png' : 'image/jpeg'
                console.log('Template fetched successfully from blob storage')
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

                const regGrade = (reg as any).grade || 'PARTICIPATION'
                const certPoints = CERT_SCORE_MAP[regGrade] || 2

                const pdfBuffer = await generateCertificatePDF({
                    templateBuffer,
                    templateMimeType,
                    studentName: reg.user.fullName,
                    programName: `${reg.program.name} (${reg.program.type})`,
                    grade: (reg as any).grade,
                    points: certPoints,
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

        revalidatePath('/dashboard')
        return { success: true, message: `Processed ${registrations.length}. ${successCount} sent, ${failCount} failed.` }
    } catch (error: any) {
        console.error('Certificate generation failed:', error)
        return { success: false, error: error?.message || 'Processing failed' }
    }
}
