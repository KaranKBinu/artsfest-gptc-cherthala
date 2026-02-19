'use client'

import React from 'react'
import Link from 'next/link'
import { cinzel } from '@/lib/fonts'
import styles from './Footer.module.css'
import { useConfig } from '@/context/ConfigContext'
import { APP_VERSION } from '@/utils/version'
import { usePushNotifications } from '@/hooks/usePushNotifications'

export default function Footer() {
    const { config } = useConfig()
    const { isSupported, isSubscribed, subscribe } = usePushNotifications()
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

                            {isSupported && !isSubscribed && (
                                <button onClick={subscribe} className={styles.subscribeBtn}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                                    </svg>
                                    Get Live Updates
                                </button>
                            )}
                            {isSupported && isSubscribed && (
                                <div style={{ fontSize: '0.85rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '0.5rem', fontWeight: 500 }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                    Updates Enabled
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className={styles.bottomSection}>
                    <div className={styles.copyright}>
                        &copy; {currentYear} {config.festivalName}. All rights reserved.
                        <span className={styles.versionText}>v{APP_VERSION}</span>
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
