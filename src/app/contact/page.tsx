'use client'

import React, { useState } from 'react'
import { Cinzel, Inter } from 'next/font/google'
import styles from './contact.module.css'
import { useConfig } from '@/context/ConfigContext'
import { useModals } from '@/context/ModalContext'
import { submitFeedback } from '@/actions/feedback'

const cinzel = Cinzel({ subsets: ['latin'] })
const inter = Inter({ subsets: ['latin'] })

export default function ContactPage() {
    const { config } = useConfig()
    const { showToast } = useModals()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)

        const formData = new FormData(e.currentTarget)
        const data = {
            name: formData.get('name') as string,
            email: formData.get('email') as string,
            subject: formData.get('subject') as string,
            message: formData.get('message') as string,
            category: 'CONTACT'
        }

        const res = await submitFeedback(data)

        if (res.success) {
            showToast('Message sent successfully!', 'success')
                ; (e.target as HTMLFormElement).reset()
        } else {
            showToast(res.error || 'Failed to send message', 'error')
        }

        setIsSubmitting(false)
    }

    return (
        <main className={`${styles.container} ${inter.className}`}>
            <section className={styles.hero}>
                <div className={styles.heroOverlay}></div>
                <div className={styles.heroContent}>
                    <h1 className={`${styles.title} ${cinzel.className}`}>Connect With Us</h1>
                    <p className={styles.subtitle}>Have questions or feedback? We'd love to hear from you.</p>
                </div>
            </section>

            <section className={styles.mainContent}>
                <div className={styles.wrapper}>
                    <div className={styles.contactGrid}>
                        {/* Contact Info */}
                        <div className={styles.infoColumn}>
                            <h2 className={`${cinzel.className} ${styles.sectionTitle}`}>Contact Information</h2>
                            <p className={styles.infoDesc}>Reach out to the organizing committee for any inquiries regarding the {config.festivalName}.</p>

                            <div className={styles.infoItems}>
                                {config.contactInfo && Object.entries(config.contactInfo).map(([key, value]) => {
                                    if (key === 'title') return null;
                                    if (!value || typeof value !== 'string') return null;

                                    const k = key.toLowerCase();
                                    const isEmail = k.includes('email') || k.includes('mail');
                                    const isPhone = k.includes('phone') || k.includes('tel') || k.includes('mobile') || k.includes('contact');

                                    let icon = '📍';
                                    let href = '';
                                    if (isEmail) {
                                        icon = '✉️';
                                        href = `mailto:${value}`;
                                    } else if (isPhone) {
                                        icon = '📞';
                                        href = `tel:${value.replace(/[^0-9+]/g, '')}`;
                                    }

                                    return (
                                        <div key={key} className={styles.infoItem}>
                                            <div className={styles.iconWrapper}>{icon}</div>
                                            <div className={styles.infoText}>
                                                <h3 style={{ textTransform: 'capitalize' }}>{key}</h3>
                                                {href ? (
                                                    <a href={href} className={styles.contactLink}>{value}</a>
                                                ) : (
                                                    <p>{value}</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {!config.contactInfo && (
                                    <>
                                        <div className={styles.infoItem}>
                                            <div className={styles.iconWrapper}>📍</div>
                                            <div className={styles.infoText}>
                                                <h3>Location</h3>
                                                <p>Government Polytechnic College,<br />Cherthala, Kerala, India</p>
                                            </div>
                                        </div>
                                        <div className={styles.infoItem}>
                                            <div className={styles.iconWrapper}>✉️</div>
                                            <div className={styles.infoText}>
                                                <h3>Email</h3>
                                                <a href="mailto:artsfest@gptccala.com" className={styles.contactLink}>artsfest@gptccala.com</a>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>


                        </div>

                        {/* Contact Form */}
                        <div className={styles.formColumn}>
                            <div className={styles.formCard}>
                                <h2 className={`${cinzel.className} ${styles.formTitle}`}>Send a Message</h2>
                                <form className={styles.form} onSubmit={handleSubmit}>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="name">Full Name</label>
                                        <input type="text" id="name" name="name" placeholder="Enter your name" required />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="email">Email Address</label>
                                        <input type="email" id="email" name="email" placeholder="example@domain.com" required />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="subject">Subject</label>
                                        <input type="text" id="subject" name="subject" placeholder="What is this about?" />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="message">Message</label>
                                        <textarea id="message" name="message" rows={5} placeholder="Your thoughts here..." required></textarea>
                                    </div>
                                    <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                                        {isSubmitting ? 'Sending...' : 'Send Message'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    )
}
