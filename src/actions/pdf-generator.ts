'use server'

import { prisma } from '@/lib/prisma'
import puppeteer from 'puppeteer-core'
// @ts-expect-error - Chromium types can be tricky in certain environments
import chromium from '@sparticuz/chromium'

/**
 * Shared utility to launch puppeteer
 */
async function getBrowser() {
    const isLocal = process.env.NODE_ENV === 'development' || !process.env.VERCEL

    if (!isLocal) {
        chromium.setGraphicsMode = false
    }

    const execPath = isLocal
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : await chromium.executablePath()

    return await puppeteer.launch({
        args: isLocal
            ? ['--no-sandbox', '--disable-setuid-sandbox']
            : [...chromium.args, '--disable-gpu'],
        defaultViewport: chromium.defaultViewport,
        executablePath: execPath,
        headless: true,
    })
}

/**
 * Generate a PDF for a student's own registrations
 */
export async function generateStudentRegistrationsPDF(userId: string) {
    try {
        const [userRaw, registrationsRaw, festivalNameConfig] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                include: { House: true }
            }),
            prisma.registration.findMany({
                where: {
                    OR: [
                        { userId: userId },
                        { GroupMember: { some: { userId: userId } } }
                    ],
                    status: { not: 'CANCELLED' }
                },
                include: { Program: true },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.configuration.findUnique({ where: { key: 'festivalName' } })
        ])

        if (!userRaw) throw new Error('User not found')

        // Map for consistency
        const user = { ...userRaw, house: userRaw.House }
        const registrations = registrationsRaw.map(r => ({ ...r, program: r.Program }))

        const festivalName = festivalNameConfig?.value || 'ArtsFest GPTC'
        const dateStr = new Date().toLocaleDateString('en-IN')

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Malayalam:wght@400;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
            <style>
                body {
                    font-family: 'Inter', sans-serif;
                    padding: 40px;
                    color: #333;
                    line-height: 1.5;
                }
                .malayalam {
                    font-family: 'Noto Sans Malayalam', sans-serif;
                }
                .header {
                    text-align: center;
                    margin-bottom: 40px;
                    border-bottom: 2px solid #8B0000;
                    padding-bottom: 20px;
                }
                .festival-name {
                    color: #8B0000;
                    font-size: 28px;
                    font-weight: bold;
                    margin: 0;
                    text-transform: uppercase;
                }
                .title {
                    font-size: 18px;
                    color: #666;
                    margin-top: 5px;
                }
                .student-info {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                    margin-bottom: 30px;
                    background: #f9f9f9;
                    padding: 20px;
                    border-radius: 8px;
                }
                .info-item b {
                    color: #8B0000;
                    display: inline-block;
                    width: 120px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                th {
                    background-color: #8B0000;
                    color: white;
                    text-align: left;
                    padding: 12px;
                    font-size: 14px;
                }
                td {
                    border-bottom: 1px solid #eee;
                    padding: 12px;
                    font-size: 14px;
                }
                .status-confirmed { color: #27ae60; font-weight: 600; }
                .footer {
                    margin-top: 50px;
                    font-size: 12px;
                    color: #888;
                    text-align: center;
                    font-style: italic;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1 class="festival-name malayalam">${festivalName}</h1>
                <div class="title">Official Registration Summary</div>
            </div>

            <div class="student-info">
                <div class="info-item"><b>Name:</b> ${user.fullName}</div>
                <div class="info-item"><b>Admission No:</b> ${user.studentAdmnNo}</div>
                <div class="info-item"><b>Department:</b> ${user.department || 'N/A'}</div>
                <div class="info-item"><b>House:</b> <span class="malayalam">${user.house?.name || 'N/A'}</span></div>
                <div class="info-item"><b>Download Date:</b> ${dateStr}</div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Program</th>
                        <th>Category</th>
                        <th>Type</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${registrations.map(reg => `
                        <tr>
                            <td class="malayalam">${reg.program.name}</td>
                            <td>${reg.program.category.replace('_', ' ')}</td>
                            <td>${reg.program.type}</td>
                            <td class="status-confirmed">${reg.status}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="footer">
                <p>Note: This is an automatically generated receipt of your registrations.</p>
                <p>Please carry this for any attendance verification if required.</p>
                <p>&copy; ${new Date().getFullYear()} ${festivalName} Organizing Committee</p>
            </div>
        </body>
        </html>
        `

        const browser = await getBrowser()
        try {
            const page = await browser.newPage()
            await page.setContent(html, { waitUntil: 'networkidle0' })
            await page.evaluateHandle('document.fonts.ready')

            const pdf = await page.pdf({
                format: 'a4',
                printBackground: true,
                margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
            })

            return { success: true, pdf: Buffer.from(pdf).toString('base64') }
        } finally {
            await browser.close()
        }
    } catch (error: any) {
        console.error('Failed to generate student PDF:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Generate a PDF for admin export
 */
export async function generateAdminExportPDF(usersData: any[]) {
    try {
        const festivalNameConfig = await prisma.configuration.findUnique({ where: { key: 'festivalName' } })
        const festivalName = festivalNameConfig?.value || 'ArtsFest GPTC'

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Malayalam:wght@400;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Inter', sans-serif; padding: 20px; color: #333; }
                .malayalam { font-family: 'Noto Sans Malayalam', sans-serif; }
                h1 { color: #8B0000; text-align: center; margin-bottom: 30px; }
                table { width: 100%; border-collapse: collapse; font-size: 11px; }
                th { background-color: #f4f4f4; border: 1px solid #ddd; padding: 8px; text-align: left; }
                td { border: 1px solid #ddd; padding: 8px; vertical-align: top; }
                .reg-item { margin-bottom: 4px; border-bottom: 1px solid #eee; padding-bottom: 2px; }
                .reg-item:last-child { border-bottom: none; }
            </style>
        </head>
        <body>
            <h1 class="malayalam">${festivalName} - Student Participants List</h1>
            <table>
                <thead>
                    <tr>
                        <th style="width: 15%">Name</th>
                        <th style="width: 10%">Adm No</th>
                        <th style="width: 15%">Department</th>
                        <th style="width: 10%">House</th>
                        <th style="width: 50%">Registrations (Status)</th>
                    </tr>
                </thead>
                <tbody>
                    ${usersData.map(u => `
                        <tr>
                            <td>${u.fullName}</td>
                            <td>${u.studentAdmnNo}</td>
                            <td>${u.department || ''}</td>
                            <td class="malayalam">${u.House?.name || ''}</td>
                            <td>
                                ${u.Registration.map((r: any) => {
            let status = 'Absent'
            if (r.Attendance?.some((a: any) => a.isPresent)) status = 'Present'
            return `<div class="reg-item"><span class="malayalam">${r.Program.name}</span> (${r.Program.type}) - <b>${status}</b></div>`
        }).join('')}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>
        `

        const browser = await getBrowser()
        try {
            const page = await browser.newPage()
            await page.setContent(html, { waitUntil: 'networkidle0' })
            await page.evaluateHandle('document.fonts.ready')

            const pdf = await page.pdf({
                format: 'a4',
                landscape: true,
                printBackground: true,
                margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
            })

            return { success: true, pdf: Buffer.from(pdf).toString('base64') }
        } finally {
            await browser.close()
        }
    } catch (error: any) {
        console.error('Failed to generate admin export PDF:', error)
        return { success: false, error: error.message }
    }
}
