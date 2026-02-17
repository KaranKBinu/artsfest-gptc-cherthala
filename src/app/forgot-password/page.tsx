'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import styles from '../auth.module.css'
import { Cinzel, Inter } from 'next/font/google'
import { useLoading } from '@/context/LoadingContext'
import LoadingSpinner from '@/components/LoadingSpinner'
import { requestPasswordReset, resetPassword } from '@/actions/auth-reset'

const cinzel = Cinzel({ subsets: ['latin'] })
const inter = Inter({ subsets: ['latin'] })

export default function ForgotPasswordPage() {
    const { setIsLoading } = useLoading()
    const [step, setStep] = useState(1) // 1: Email, 2: OTP & New Password, 3: Success
    const [email, setEmail] = useState('')
    const [otp, setOtp] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')

    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) return setError('Please enter your email')

        setLoading(true)
        setIsLoading(true, "Sending OTP")
        setError('')
        setMessage('')

        try {
            const res = await requestPasswordReset(email)
            if (res.success) {
                setMessage(res.message || 'OTP sent.')
                setStep(2)
            } else {
                setError(res.error || 'Failed to request OTP')
            }
        } catch (err) {
            setError('Something went wrong')
        } finally {
            setLoading(false)
            setIsLoading(false)
        }
    }

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!otp || !password || !confirmPassword) return setError('Please fill in all fields')
        if (password !== confirmPassword) return setError('Passwords do not match')
        if (password.length < 6) return setError('Password must be at least 6 characters')

        setLoading(true)
        setIsLoading(true, "Resetting Password")
        setError('')

        try {
            const res = await resetPassword(email, otp, password)
            if (res.success) {
                setMessage(res.message || 'Password reset successful.')
                setStep(3)
            } else {
                setError(res.error || 'Failed to reset password')
            }
        } catch (err) {
            setError('Something went wrong')
        } finally {
            setLoading(false)
            setIsLoading(false)
        }
    }

    return (
        <div className={`${styles.container} ${inter.className}`}>
            <div className={`${styles.authCard} animate-scale-up`}>
                <h1 className={`${styles.title} ${cinzel.className}`}>
                    {step === 1 ? 'Forgot Password' : step === 2 ? 'Reset Password' : 'Password Reset'}
                </h1>
                <p className={styles.subtitle}>
                    {step === 1 ? 'Enter your email to receive an OTP' : step === 2 ? 'Enter the OTP and your new password' : 'Your password has been reset'}
                </p>

                {step === 1 && (
                    <form onSubmit={handleRequestOtp} className={styles.form}>
                        <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor="email">Email Address</label>
                            <input
                                type="email"
                                id="email"
                                className={styles.input}
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        {error && <p style={{ color: 'red', fontSize: '0.9rem' }}>{error}</p>}
                        <button type="submit" className={styles.submitButton} disabled={loading}>
                            {loading ? <LoadingSpinner size="20px" /> : 'Send OTP'}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleResetPassword} className={styles.form}>
                        <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor="otp">OTP</label>
                            <input
                                type="text"
                                id="otp"
                                className={styles.input}
                                placeholder="Enter 6-digit OTP"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                                maxLength={6}
                                style={{ textAlign: 'center', letterSpacing: '5px', fontSize: '1.2rem' }}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor="password">New Password</label>
                            <div className={styles.passwordWrapper}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    className={styles.input}
                                    placeholder="Enter new password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className={styles.passwordToggle}
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                            <line x1="1" y1="1" x2="23" y2="23"></line>
                                        </svg>
                                    ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor="confirmPassword">Confirm New Password</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                className={styles.input}
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                        {error && <p style={{ color: 'red', fontSize: '0.9rem' }}>{error}</p>}
                        {message && <p style={{ color: 'green', fontSize: '0.9rem' }}>{message}</p>}
                        <button type="submit" className={styles.submitButton} disabled={loading}>
                            {loading ? <LoadingSpinner size="20px" /> : 'Reset Password'}
                        </button>
                        <button type="button" onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--primary-red)', cursor: 'pointer', fontSize: '0.9rem', marginTop: '10px' }}>
                            Back to Email
                        </button>
                    </form>
                )}

                {step === 3 && (
                    <div style={{ textAlign: 'center', padding: '1rem' }}>
                        <div style={{ fontSize: '3.5rem', color: '#2ecc71', marginBottom: '1rem' }}>✓</div>
                        <p style={{ color: '#27ae60', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '2rem' }}>
                            {message}
                        </p>
                        <Link href="/login" className={styles.submitButton} style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            Sign In Now
                        </Link>
                    </div>
                )}

                <div className={styles.links}>
                    <p>
                        <Link href="/login" className={styles.link}>
                            Back to Login
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
