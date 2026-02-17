'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import styles from '../auth.module.css'
import { Cinzel, Inter } from 'next/font/google'
import { useLoading } from '@/context/LoadingContext'
import LoadingSpinner from '@/components/LoadingSpinner'

import { useConfig } from '@/context/ConfigContext'

const cinzel = Cinzel({ subsets: ['latin'] })
const inter = Inter({ subsets: ['latin'] })

export default function RegisterPage() {
    const { config } = useConfig()
    const router = useRouter()
    const [formData, setFormData] = useState({
        fullName: '',
        studentAdmnNo: '',

        email: '',
        phone: '',
        gender: 'MALE',
        department: '',
        semester: '',
        password: '',
        confirmPassword: ''
    })
    const [departments, setDepartments] = useState<{ code: string; name: string }[]>([])
    const { setIsLoading } = useLoading()
    const [loading, setLoading] = useState(false)
    const [configLoading, setConfigLoading] = useState(true)
    const [error, setError] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const response = await fetch('/api/config')
                const data = await response.json()
                if (data.success && data.data.departments) {
                    setDepartments(data.data.departments)
                    // Set default department if available
                    if (data.data.departments.length > 0) {
                        setFormData(prev => ({ ...prev, department: data.data.departments[0].code }))
                    }
                }
            } catch (err) {
                console.error('Failed to fetch config:', err)
            } finally {
                setConfigLoading(false)
            }
        }

        fetchConfig()
    }, [])

    // Redirect if registration is disabled
    useEffect(() => {
        // If config is loaded and showRegistration is false, redirect to login or home
        if (config && config.showRegistration === false) {
            router.push(config.showLogin ? '/login' : '/')
        }
    }, [config.showRegistration, config.showLogin, router])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setIsLoading(true, "Setting up your account")
        setError('')

        // Basic validation
        if (
            !formData.fullName ||
            !formData.studentAdmnNo ||
            !formData.email ||
            !formData.phone ||
            !formData.department ||
            !formData.semester ||
            !formData.password ||
            !formData.confirmPassword
        ) {
            setError('Please fill in all fields')
            setLoading(false)
            setIsLoading(false)
            return
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match')
            setLoading(false)
            setIsLoading(false)
            return
        }

        if (formData.studentAdmnNo.length < 1) {
            setError('Student Admission Number is required')
            setLoading(false)
            setIsLoading(false)
            return
        }

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fullName: formData.fullName,
                    email: formData.email,
                    phone: formData.phone,
                    password: formData.password,
                    studentAdmnNo: formData.studentAdmnNo,
                    gender: formData.gender,
                    department: formData.department,
                    semester: formData.semester
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed')
            }

            // Auto login after successful registration
            if (data.data?.token) {
                localStorage.setItem('token', data.data.token)
                localStorage.setItem('user', JSON.stringify(data.data.user))
                document.cookie = `token=${data.data.token}; path=/`
            }

            // Redirect to dashboard
            router.push('/dashboard')
        } catch (err: any) {
            setError(err.message || 'Registration failed. Please try again.')
        } finally {
            setLoading(false)
            setIsLoading(false)
        }
    }

    return (
        <div className={`${styles.container} ${inter.className}`}>
            <div className={`${styles.authCard} animate-scale-up`} style={{ maxWidth: '600px', margin: '2rem auto' }}>
                <h1 className={`${styles.title} ${cinzel.className}`}>Create Account</h1>
                <p className={styles.subtitle}>Join the ArtsFest celebration</p>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="fullName">
                            Full Name
                        </label>
                        <input
                            type="text"
                            id="fullName"
                            name="fullName"
                            className={styles.input}
                            placeholder="Enter your full name"
                            value={formData.fullName}
                            onChange={handleChange}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="studentAdmnNo">
                            Admission Number
                        </label>
                        <input
                            type="text"
                            id="studentAdmnNo"
                            name="studentAdmnNo"
                            className={styles.input}
                            placeholder="Enter your admission number"
                            value={formData.studentAdmnNo}
                            onChange={handleChange}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="email">
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            className={styles.input}
                            placeholder="Enter your email"
                            value={formData.email}
                            onChange={handleChange}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="phone">
                            Phone Number
                        </label>
                        <input
                            type="tel"
                            id="phone"
                            name="phone"
                            className={styles.input}
                            placeholder="Enter your phone number"
                            value={formData.phone}
                            onChange={handleChange}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="gender">
                            Gender
                        </label>
                        <select
                            id="gender"
                            name="gender"
                            className={styles.input}
                            value={formData.gender}
                            onChange={handleChange}
                        >
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="department">
                            Department
                        </label>
                        {configLoading ? (
                            <div className={styles.input} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#999' }}>
                                <LoadingSpinner size="16px" color="#999" /> Loading departments...
                            </div>
                        ) : (
                            <select
                                id="department"
                                name="department"
                                className={styles.input}
                                value={formData.department}
                                onChange={handleChange}
                            >
                                <option value="" disabled>Select Department</option>
                                {departments.map(dept => (
                                    <option key={dept.code} value={dept.code}>
                                        {dept.name} ({dept.code})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="semester">
                            Year
                        </label>
                        <select
                            id="semester"
                            name="semester"
                            className={styles.input}
                            value={formData.semester}
                            onChange={handleChange}
                        >
                            <option value="" disabled>Select Year</option>
                            <option value="1">1st Year</option>
                            <option value="2">2nd Year</option>
                            <option value="3">3rd Year</option>
                        </select>
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
                                placeholder="Create a password"
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

                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="confirmPassword">
                            Confirm Password
                        </label>
                        <div className={styles.passwordWrapper}>
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                id="confirmPassword"
                                name="confirmPassword"
                                className={styles.input}
                                placeholder="Confirm your password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                            />
                            <button
                                type="button"
                                className={styles.passwordToggle}
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                tabIndex={-1}
                            >
                                {showConfirmPassword ? (
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
                        {loading ? <><LoadingSpinner size="20px" /> Creating Your Account...</> : 'Register'}
                    </button>
                </form>

                <div className={styles.links}>
                    {config.showLogin && (
                        <p>
                            Already have an account?
                            <Link href="/login" className={styles.link}>
                                Sign In here
                            </Link>
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}
