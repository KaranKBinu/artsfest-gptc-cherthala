'use client'

import React from 'react'
import { Cinzel, Inter } from 'next/font/google'
import styles from './about.module.css'
import { useConfig } from '@/context/ConfigContext'

const cinzel = Cinzel({ subsets: ['latin'] })
const inter = Inter({ subsets: ['latin'] })

export default function AboutPage() {
    const { config } = useConfig()

    return (
        <main className={`${styles.container} ${inter.className}`}>
            {/* Hero Section */}
            <section className={styles.hero}>
                <div className={styles.heroOverlay}></div>
                <div className={styles.heroContent}>
                    <h1 className={`${styles.title} ${cinzel.className}`}>The Spirit of <span className={styles.goldText}>{config.festivalName}</span></h1>
                    <p className={styles.subtitle}>A Symphony of Talent, Culture, and Competition</p>
                </div>
            </section>

            {/* The Essence Section */}
            <section className={styles.section}>
                <div className={styles.contentWrapper}>
                    <div className={styles.textBlock}>
                        <h2 className={`${styles.sectionTitle} ${cinzel.className}`}>Beyond the Stage</h2>
                        <p>
                            {config.festivalName} is the heartbeat of our campus life. It is the time of year when the technical corridors transform into a grand stage of traditional and modern arts. From the rhythmic echo of Chenda Melam to the soulful melodies of light music, the festival captures the very essence of Kerala's rich cultural tapestry.
                        </p>
                        <p>
                            It's not just about winning medals; it's about the late-night rehearsals, the camaraderie built behind the curtains, and the courage it takes to step into the spotlight. Every year, we witness the birth of new stars and the celebration of artistic heritage.
                        </p>
                    </div>
                </div>
            </section>


            {/* Celebration of Diversity */}
            <section className={styles.section}>
                <div className={styles.contentWrapper}>
                    <h2 className={`${styles.sectionTitle} ${styles.centered} ${cinzel.className}`}>A Celebration for Everyone</h2>
                    <div className={styles.valueGrid}>
                        <div className={styles.valueCard}>
                            <div className={styles.valueIcon}>�</div>
                            <h3>Performing Arts</h3>
                            <p>From Bharatanatyam to Mimicry, the stage is a canvas for every emotion and every rhythm.</p>
                        </div>
                        <div className={styles.valueCard}>
                            <div className={styles.valueIcon}>🖊️</div>
                            <h3>Literary Events</h3>
                            <p>Where pens become swords and words weave magic in poems, essays, and stories.</p>
                        </div>
                        <div className={styles.valueCard}>
                            <div className={styles.valueIcon}>🖼️</div>
                            <h3>Fine Arts</h3>
                            <p>Translating imagination onto paper through painting, sketching, and collage.</p>
                        </div>
                        <div className={styles.valueCard}>
                            <div className={styles.valueIcon}>📽️</div>
                            <h3>Digital Media</h3>
                            <p>Embracing the future with photography and short films that capture the fest's soul.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Legacy Section */}
            <section className={`${styles.section} ${styles.altBg}`}>
                <div className={styles.contentWrapper} style={{ textAlign: 'center' }}>
                    <h2 className={`${styles.sectionTitle} ${cinzel.className}`}>Our Legacy</h2>
                    <p style={{ maxWidth: '800px', margin: '0 auto 2rem auto' }}>
                        Over the years, {config.festivalName} has evolved from a small gathering into the most anticipated event of our academic calendar. It serves as a bridge between generations, where alumni return to relive their memories and newcomers find a place to belong.
                    </p>
                    <div className={styles.gptcText}>Experience the Magic. Share the Joy.</div>
                </div>
            </section>

            {/* Development & Support Team Section */}
            {(config.teamMembers && config.teamMembers.length > 0) && (
                <section className={styles.section}>
                    <div className={styles.contentWrapper}>
                        <h2 className={`${styles.sectionTitle} ${styles.centered} ${cinzel.className}`}>Meet Development & Support Team</h2>
                        <div className={styles.teamGrid}>
                            {config.teamMembers.map((member, idx) => (
                                <div key={idx} className={styles.teamCard}>
                                    <img
                                        src={member.photo || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=200&h=200&auto=format&fit=crop'}
                                        alt={member.name}
                                        className={styles.memberPhoto}
                                    />
                                    <h3 className={styles.memberName}>{member.name}</h3>
                                    <p className={styles.memberRole}>{member.role}</p>
                                    <a href={`mailto:${member.email}`} className={styles.memberEmail}>
                                        {member.email}
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Fallback if no team members configured yet - optional, or just let it be empty */}
            {(!config.teamMembers || config.teamMembers.length === 0) && (
                <section className={styles.section}>
                    <div className={styles.contentWrapper}>
                        <h2 className={`${styles.sectionTitle} ${styles.centered} ${cinzel.className}`}>Meet Development & Support Team</h2>
                        <div className={styles.teamGrid}>
                            <div className={styles.teamCard}>
                                <img
                                    src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=200&h=200&auto=format&fit=crop"
                                    alt="Admin"
                                    className={styles.memberPhoto}
                                />
                                <h3 className={styles.memberName}>GPTC Team</h3>
                                <p className={styles.memberRole}>Lead Developer</p>
                                <a href="mailto:arts@gptccherthala.org" className={styles.memberEmail}>
                                    arts@gptccherthala.org
                                </a>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            <footer className={styles.footer}>
                <p>&copy; {new Date().getFullYear()} {config.festivalName} Organizing Committee</p>
                <p className={styles.gptcText}>Crafted with Passion</p>
            </footer>
        </main>
    )
}
