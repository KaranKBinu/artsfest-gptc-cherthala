'use client'

import React from 'react'
import Link from 'next/link'
import { Cinzel } from 'next/font/google'
import styles from './Footer.module.css'
import { useConfig } from '@/context/ConfigContext'

const cinzel = Cinzel({ subsets: ['latin'] })

export default function Footer() {
    const { config } = useConfig()
    const currentYear = new Date().getFullYear()

    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                <div className={styles.topSection}>
                    <div className={styles.brand}>
                        <h2 className={`${styles.logo} ${cinzel.className}`}>
                            {config.festivalName}
                        </h2>
                        <p className={styles.tagline}>The Ultimate Celebration of Talent and Culture at GPTC Cherthala.</p>
                    </div>

                    <div className={styles.linksGrid}>
                        <div className={styles.linkGroup}>
                            <h3>Navigation</h3>
                            <Link href="/">Home</Link>
                            <Link href="/programs">Programs</Link>
                            <Link href="/about">About Us</Link>
                            <Link href="/contact">Contact</Link>
                        </div>
                        <div className={styles.linkGroup}>
                            <h3>Quick Access</h3>
                            {config.showLogin && <Link href="/login">Portal Login</Link>}
                            {config.showRegistration && <Link href="/register">Student Registration</Link>}
                            {config.artsFestManual && (
                                <a href={config.artsFestManual} target="_blank" rel="noopener noreferrer">
                                    Festival Manual
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                <div className={styles.bottomSection}>
                    <div className={styles.copyright}>
                        &copy; {currentYear} {config.festivalName}. All rights reserved.
                    </div>
                    <div className={styles.credits}>
                        Department of Computer Hardware Engineering
                    </div>
                    <div className={`${styles.premiumText} ${cinzel.className}`}>
                        Crafted with Passion
                    </div>
                </div>
            </div>
        </footer>
    )
}
