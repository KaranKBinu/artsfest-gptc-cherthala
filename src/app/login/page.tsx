'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import styles from '../auth.module.css'
import { Cinzel, Inter } from 'next/font/google'
import { useLoading } from '@/context/LoadingContext'
import LoadingSpinner from '@/components/LoadingSpinner'

const cinzel = Cinzel({ subsets: ['latin'] })
const inter = Inter({ subsets: ['latin'] })

export default function LoginPage() {
    const router = useRouter()
    const [formData, setFormData] = useState({
        studentAdmnNo: '',
        password: ''
    })
    const { setIsLoading } = useLoading()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setIsLoading(true, "Authenticating")
        setError('')

        // Basic validation
        if (!formData.studentAdmnNo || !formData.password) {
            setError('Please fill in all fields')
            setLoading(false)
            setIsLoading(false)
            return
        }

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Login failed')
            }

            // Store token and user data
            if (data.data?.token) {
                localStorage.setItem('token', data.data.token)
                localStorage.setItem('user', JSON.stringify(data.data.user))
                // Also set a cookie for middleware compatibility if needed in future
                document.cookie = `token=${data.data.token}; path=/`
            }

            // Redirect to dashboard
            router.push('/dashboard')
        } catch (err: any) {
            setError(err.message || 'Invalid credentials. Please try again.')
        } finally {
            setLoading(false)
            setIsLoading(false)
        }
    }

    return (
        <div className={`${styles.container} ${inter.className}`}>
            <div className={`${styles.authCard} animate-scale-up`}>
                <h1 className={`${styles.title} ${cinzel.className}`}>Welcome Back</h1>
                <p className={styles.subtitle}>Sign in to continue to ArtsFest</p>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="studentAdmnNo">
                            Admission Number or Email
                        </label>
                        <input
                            type="text"
                            id="studentAdmnNo"
                            name="studentAdmnNo"
                            className={styles.input}
                            placeholder="Enter your admission number or email"
                            value={formData.studentAdmnNo}
                            onChange={handleChange}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="password">
                            Password
                        </label>
                        <div className={styles.passwordWrapper}>
                            <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                name="password"
                                className={styles.input}
                                placeholder="Enter your password"
                                value={formData.password}
                                onChange={handleChange}
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

                    {error && <p style={{ color: 'red', fontSize: '0.9rem' }}>{error}</p>}

                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={loading}
                        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
                    >
                        {loading ? <><LoadingSpinner size="20px" /> Validating...</> : 'Sign In'}
                    </button>
                </form>

                <div className={styles.links}>
                    <Link href="/forgot-password" className={styles.link} style={{ display: 'block', marginBottom: '1rem' }}>
                        Forgot Password?
                    </Link>
                    Don't have an account?
                    <Link href="/register" className={styles.link}>
                        Register
                    </Link>
                </div>
            </div>
        </div>
    )
}
