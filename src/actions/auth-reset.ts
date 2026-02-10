'use server'

import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/mail'
import bcrypt from 'bcryptjs'

export async function requestPasswordReset(email: string) {
    try {
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) {
            // We return success even if user not found for security reasons (avoiding email enumeration)
            return { success: true, message: 'If an account exists with this email, an OTP has been sent.' }
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString()
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

        // Save OTP
        await prisma.passwordReset.create({
            data: {
                email,
                otp,
                expiresAt
            }
        })

        // Fetch SMTP config from database
        const configs = await prisma.configuration.findMany({
            where: { key: { in: ['smtpConfig', 'festivalName'] } }
        })

        const smtpConfig = configs.find(c => c.key === 'smtpConfig')
        const festivalName = configs.find(c => c.key === 'festivalName')?.value || 'ArtsFest'

        let smtpParsed = undefined
        if (smtpConfig) {
            try {
                smtpParsed = JSON.parse(smtpConfig.value)
            } catch (e) {
                console.error('Failed to parse SMTP config', e)
            }
        }

        // Send Email
        const emailRes = await sendEmail({
            to: email,
            subject: `Password Reset OTP - ${festivalName}`,
            text: `Your OTP for password reset is: ${otp}. It is valid for 10 minutes.`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #8b0000;">${festivalName} Password Reset</h2>
                    <p>You requested a password reset. Use the OTP below to proceed:</p>
                    <div style="background: #f4f4f4; padding: 15px; font-size: 24px; font-weight: bold; letter-spacing: 5px; text-align: center; border-radius: 8px;">
                        ${otp}
                    </div>
                    <p>This OTP is valid for <b>10 minutes</b>. If you didn't request this, please ignore this email.</p>
                </div>
            `,
            smtpConfig: smtpParsed?.user ? smtpParsed : undefined
        })

        if (!emailRes.success) {
            console.error('Email send failed:', emailRes.error)
            // Still return success for security, but log the error
            // Actually, if it's a configuration error, we might want to know.
        }

        return { success: true, message: 'If an account exists with this email, an OTP has been sent.' }
    } catch (error) {
        console.error('Password reset request error:', error)
        return { success: false, error: 'An error occurred. Please try again later.' }
    }
}

export async function resetPassword(email: string, otp: string, password: string) {
    try {
        const resetRequest = await prisma.passwordReset.findFirst({
            where: {
                email,
                otp,
                expiresAt: { gt: new Date() }
            },
            orderBy: { createdAt: 'desc' }
        })

        if (!resetRequest) {
            return { success: false, error: 'Invalid or expired OTP' }
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10)

        // Update user password
        await prisma.user.update({
            where: { email },
            data: { password: hashedPassword }
        })

        // Delete all reset requests for this email
        await prisma.passwordReset.deleteMany({
            where: { email }
        })

        return { success: true, message: 'Password reset successful. You can now login.' }
    } catch (error) {
        console.error('Reset password error:', error)
        return { success: false, error: 'Failed to reset password. Please try again.' }
    }
}
