'use client'

import 'regenerator-runtime/runtime'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Cinzel, Inter } from 'next/font/google'
import styles from './dashboard.module.css'
import { AuthResponse } from '@/types'
import writeXlsxFile from 'write-excel-file'
import { useLoading } from '@/context/LoadingContext'
import LoadingSpinner from '@/components/LoadingSpinner'
import { APP_VERSION } from '@/utils/version'

const cinzel = Cinzel({ subsets: ['latin'] })
const inter = Inter({ subsets: ['latin'] })

import { getDashboardData, DashboardData } from '@/actions/dashboard'
import { getUsersForAdmin, getHouses, getCoordinators, updateUserRole } from '@/actions/users'
import { generateStudentRegistrationsPDF, generateAdminExportPDF } from '@/actions/pdf-generator'
import { useConfig } from '@/context/ConfigContext'
import { useModals } from '@/context/ModalContext'
import {
    createProgram,
    updateProgram,
    deleteProgram,
    getConfigs,
    updateConfig,
    createConfig,
    deleteConfig,
    getAllUsers,
    updateUser,
    deleteUser,
    createUser
} from '@/actions/admin'
import { getVolunteers, addVolunteer, removeVolunteer } from '@/actions/volunteers'
import { getPrograms } from '@/actions/programs'
import { Program, ProgramType, ProgramCategory, Configuration } from '@prisma/client'

// Helper to check if string is JSON
const isJsonString = (str: string) => {
    try {
        const parsed = JSON.parse(str);
        return typeof parsed === 'object' && parsed !== null;
    } catch (e) {
        return false;
    }
}

function TeamMembersEditor({ value, onChange }: { value: string, onChange: (val: string) => void }) {
    const modals = useModals()
    const [members, setMembers] = useState<any[]>([])
    const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)

    useEffect(() => {
        try {
            const parsed = JSON.parse(value || '[]')
            if (Array.isArray(parsed)) setMembers(parsed)
        } catch (e) {
            setMembers([])
        }
    }, [value])

    const updateMembers = (newMembers: any[]) => {
        setMembers(newMembers)
        onChange(JSON.stringify(newMembers))
    }

    const addMember = () => {
        updateMembers([...members, { name: 'New Member', role: 'Developer', email: '', photo: '' }])
    }

    const removeMember = (idx: number) => {
        const newMembers = [...members]
        newMembers.splice(idx, 1)
        updateMembers(newMembers)
    }

    const handleMemberChange = (idx: number, field: string, val: string) => {
        const newMembers = [...members]
        newMembers[idx] = { ...newMembers[idx], [field]: val }
        updateMembers(newMembers)
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {members.map((m, idx) => (
                <div key={idx} style={{ padding: '1.2rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.03)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--primary-gold)' }}>Member #{idx + 1}</h4>
                        <button
                            type="button"
                            onClick={() => removeMember(idx)}
                            style={{ color: 'var(--color-danger)', background: 'rgba(var(--color-danger-rgb), 0.1)', border: 'none', cursor: 'pointer', fontSize: '0.8rem', padding: '4px 12px', borderRadius: '4px', transition: 'all 0.2s' }}
                        >
                            Remove
                        </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Name</label>
                            <input value={m.name} onChange={(e) => handleMemberChange(idx, 'name', e.target.value)} className={styles.searchInput} placeholder="Full Name" />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Role</label>
                            <input value={m.role} onChange={(e) => handleMemberChange(idx, 'role', e.target.value)} className={styles.searchInput} placeholder="e.g. Lead Developer" />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Email</label>
                            <input value={m.email} onChange={(e) => handleMemberChange(idx, 'email', e.target.value)} className={styles.searchInput} placeholder="email@example.com" />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Photo URL</label>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <input
                                    value={m.photo}
                                    onChange={(e) => handleMemberChange(idx, 'photo', e.target.value)}
                                    className={styles.searchInput}
                                    placeholder="https://..."
                                    style={{ flex: 1 }}
                                />
                                <div style={{ position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                                    <button
                                        type="button"
                                        className={styles.editBtn}
                                        style={{
                                            padding: '10px',
                                            width: '42px',
                                            height: '42px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            backgroundColor: uploadingIdx === idx ? 'var(--color-warning)' : undefined
                                        }}
                                        disabled={uploadingIdx === idx}
                                    >
                                        {uploadingIdx === idx ? (
                                            <span className={styles.spinner}></span>
                                        ) : (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                <polyline points="17 8 12 3 7 8" />
                                                <line x1="12" y1="3" x2="12" y2="15" />
                                            </svg>
                                        )}
                                    </button>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                        onChange={async (e) => {
                                            if (e.target.files?.[0]) {
                                                setUploadingIdx(idx)
                                                try {
                                                    const formData = new FormData()
                                                    formData.append('file', e.target.files[0])
                                                    const res = await fetch('/api/upload', { method: 'POST', body: formData })
                                                    const data = await res.json()
                                                    if (data.success) {
                                                        handleMemberChange(idx, 'photo', data.url)
                                                        modals.showToast('Photo uploaded!', 'success')
                                                    } else {
                                                        modals.showToast(data.error || 'Upload failed', 'error')
                                                    }
                                                } catch (err) {
                                                    modals.showToast('Upload error', 'error')
                                                } finally {
                                                    setUploadingIdx(null)
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
            <button type="button" onClick={addMember} className={styles.addButton} style={{ padding: '0.8rem', fontSize: '0.9rem', borderRadius: '10px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Team Member
            </button>
        </div>
    )
}

// Configuration Modal Component
function ConfigurationModal({ isOpen, config, onClose, onSave, onDelete }: { isOpen: boolean, config?: any, onClose: () => void, onSave: (data: { key: string, value: string, description: string }) => void, onDelete?: (key: string) => void }) {
    const modals = useModals()
    const [key, setKey] = useState('')
    const [value, setValue] = useState('')
    const [description, setDescription] = useState('')
    const [type, setType] = useState<'TEXT' | 'NUMBER' | 'BOOLEAN' | 'JSON' | 'FILE'>('TEXT')
    const [jsonError, setJsonError] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (config) {
            setKey(config.key)
            setDescription(config.description || '')

            // Infer type
            const isJson = isJsonString(config.value) || config.key === 'REGISTRATION_LIMITS' || config.key === 'smtpConfig' || (config.value && (config.value.startsWith('{') || config.value.startsWith('[')))
            if (isJson) {
                setType('JSON')
                try {
                    const parsed = JSON.parse(config.value)
                    setValue(JSON.stringify(parsed, null, 4))
                } catch (e) {
                    setValue(config.value)
                }
            } else if (config.key === 'artsFestManual' || config.key === 'certificateTemplate' || (typeof config.value === 'string' && config.value.startsWith('http'))) {
                if (config.key === 'artsFestManual' || config.key === 'certificateTemplate') setType('FILE')
                else setType('TEXT')
                setValue(config.value)
            } else if (config.value === 'true' || config.value === 'false') {
                setType('BOOLEAN')
                setValue(config.value)
            } else if (!isNaN(Number(config.value)) && config.value.trim() !== '') {
                setType('NUMBER')
                setValue(config.value)
            } else {
                setType('TEXT')
                setValue(config.value)
            }
        } else {
            setKey('')
            setValue('')
            setDescription('')
            setType('TEXT')
        }
    }, [config, isOpen])

    const handleChange = (e: any) => {
        const val = e.target.value
        setValue(val)

        if (type === 'JSON') {
            try {
                JSON.parse(val)
                setJsonError(null)
            } catch (e) {
                setJsonError('Invalid JSON format')
            }
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (type === 'JSON' && jsonError) return

        setIsSaving(true)
        try {
            let finalValue = value;
            if (type === 'JSON' && !jsonError) {
                finalValue = JSON.stringify(JSON.parse(value))
            }

            await onSave({
                key,
                description,
                value: finalValue
            })
        } finally {
            setIsSaving(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.adminModal} style={{ maxWidth: '600px' }}>
                <h2 className={`${styles.cardTitle} ${cinzel.className}`}>{config ? 'Edit Configuration' : 'Create Configuration'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className={styles.formGrid} style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1rem', marginBottom: '1rem', display: 'grid' }}>
                        <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                            <label className={styles.formLabel}>Key</label>
                            <input
                                name="key"
                                value={key}
                                onChange={(e) => setKey(e.target.value)}
                                className={styles.searchInput}
                                required
                                disabled={!!config}
                                style={{ opacity: config ? 0.7 : 1 }}
                                placeholder="Key (e.g. siteTitle)"
                            />
                        </div>
                        <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                            <label className={styles.formLabel}>Type</label>
                            <select
                                className={styles.selectInput}
                                value={type}
                                onChange={(e) => {
                                    setType(e.target.value as any)
                                    setJsonError(null)
                                }}
                            >
                                <option value="TEXT">Text</option>
                                <option value="NUMBER">Number</option>
                                <option value="BOOLEAN">Boolean</option>
                                <option value="JSON">JSON</option>
                                <option value="FILE">File / URL</option>
                            </select>
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Description</label>
                        <input
                            name="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className={styles.searchInput}
                            placeholder="Description"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Value {type === 'JSON' && key !== 'teamMembers' && <span style={{ fontSize: '0.8rem', color: 'var(--color-info)', marginLeft: '0.5rem' }}>(JSON Editor)</span>}</label>

                        {key === 'teamMembers' ? (
                            <TeamMembersEditor value={value} onChange={setValue} />
                        ) : type === 'FILE' ? (
                            <div style={{ marginBottom: '1rem' }}>
                                <input
                                    type="file"
                                    onChange={async (e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            const file = e.target.files[0]
                                            const formData = new FormData()
                                            formData.append('file', file)
                                            console.log('Uploading file:', file.name, 'Size:', file.size);
                                            try {
                                                const res = await fetch('/api/upload', { method: 'POST', body: formData })
                                                console.log('Upload response status:', res.status);

                                                if (!res.ok) {
                                                    const text = await res.text();
                                                    console.error('Upload failed with status:', res.status, text);
                                                    throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
                                                }

                                                const data = await res.json()
                                                if (data.success) {
                                                    console.log('Upload success:', data.url);
                                                    setValue(data.url)
                                                    modals.showToast('File uploaded successfully!', 'success')
                                                } else {
                                                    console.error('Upload API returned error:', data.error);
                                                    modals.showToast('Upload failed: ' + data.error, 'error')
                                                }
                                            } catch (err) {
                                                console.error('Upload error:', err)
                                                modals.showToast('Upload failed. Check console for details.', 'error')
                                            }
                                        }
                                    }}
                                    style={{ marginBottom: '0.5rem' }}
                                />
                                <input
                                    type="text"
                                    name="value"
                                    value={value}
                                    onChange={handleChange}
                                    className={styles.searchInput}
                                    placeholder="Or enter URL manually"
                                />
                            </div>
                        ) : type === 'JSON' ? (
                            <>
                                <textarea
                                    name="value"
                                    value={value}
                                    onChange={handleChange}
                                    className={styles.searchInput}
                                    style={{
                                        minHeight: '200px',
                                        fontFamily: 'monospace',
                                        fontSize: '0.9rem',
                                        whiteSpace: 'pre',
                                        tabSize: 4,
                                        borderColor: jsonError ? 'var(--color-danger)' : undefined
                                    }}
                                    required
                                    spellCheck={false}
                                />
                                {jsonError ? <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginTop: '0.5rem' }}>{jsonError}</p> : null}
                            </>
                        ) : type === 'BOOLEAN' ? (
                            <select
                                className={styles.selectInput}
                                value={value}
                                onChange={handleChange}
                            >
                                <option value="">Select boolean value</option>
                                <option value="true">True</option>
                                <option value="false">False</option>
                            </select>
                        ) : type === 'NUMBER' ? (
                            <input
                                type="number"
                                name="value"
                                value={value}
                                onChange={handleChange}
                                className={styles.searchInput}
                                required
                            />
                        ) : (
                            <input
                                name="value"
                                value={value}
                                onChange={handleChange}
                                className={styles.searchInput}
                                required
                            />
                        )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', alignItems: 'center' }}>
                        {config && onDelete && (
                            <button
                                type="button"
                                onClick={() => {
                                    modals.confirm({
                                        title: 'Delete Configuration',
                                        message: 'Are you sure you want to delete this configuration? This action cannot be undone.',
                                        confirmText: 'Delete',
                                        onConfirm: () => onDelete(config.key)
                                    })
                                }}
                                className={styles.cancelButton}
                                style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                            >
                                Delete
                            </button>
                        )}
                        {!config && <div />}
                        <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto' }}>
                            <button type="button" onClick={onClose} className={styles.cancelButton}>Cancel</button>
                            <button
                                type="submit"
                                className={styles.addButton}
                                disabled={(type === 'JSON' && !!jsonError) || isSaving}
                                style={{
                                    opacity: ((type === 'JSON' && !!jsonError) || isSaving) ? 0.5 : 1,
                                    cursor: ((type === 'JSON' && !!jsonError) || isSaving) ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    minWidth: '80px',
                                    justifyContent: 'center'
                                }}
                            >
                                {isSaving ? (
                                    <>
                                        <LoadingSpinner size="18px" />
                                        Saving
                                    </>
                                ) : 'Save'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}

function UserModal({ isOpen, user, houses, onClose, onSave }: {
    isOpen: boolean,
    user: any | null,
    houses: any[],
    onClose: () => void,
    onSave: (data: any) => Promise<void>
}) {
    const modals = useModals()
    const [showPassword, setShowPassword] = useState(false)
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        role: 'STUDENT',
        houseId: '',
        semester: '',
        department: '',
        studentAdmnNo: '',
        gender: 'MALE',
        password: '',
        isVolunteer: false,
    })
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (user) {
            setFormData({
                fullName: user.fullName || '',
                email: user.email || '',
                phone: user.phone || '',
                role: user.role || 'STUDENT',
                houseId: user.houseId || '',
                department: user.department || '',
                semester: user.semester || '',
                studentAdmnNo: user.studentAdmnNo || '',
                gender: user.gender || 'MALE',
                password: '',
                isVolunteer: user.isVolunteer || false,
            })
        } else {
            setFormData({
                fullName: '',
                email: '',
                phone: '',
                role: 'STUDENT',
                houseId: '',
                department: '',
                semester: '',
                studentAdmnNo: '',
                gender: 'MALE',
                password: ''
            })
        }
    }, [user, isOpen])

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        try {
            await onSave(formData)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.adminModal} style={{ maxWidth: '800px' }}>
                <h2 className={`${styles.cardTitle} ${cinzel.className}`}>
                    {user ? 'Edit User' : 'Create New User'}
                </h2>
                <form onSubmit={handleSubmit}>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Full Name {formData.role !== 'ADMIN' && formData.role !== 'MASTER' && '*'}</label>
                            <input
                                value={formData.fullName}
                                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                className={styles.searchInput}
                                required={formData.role !== 'ADMIN' && formData.role !== 'MASTER'}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className={styles.searchInput}
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Admission No {formData.role !== 'ADMIN' && formData.role !== 'MASTER' && '*'}</label>
                            <input
                                value={formData.studentAdmnNo}
                                onChange={e => setFormData({ ...formData, studentAdmnNo: e.target.value })}
                                className={styles.searchInput}
                                required={formData.role !== 'ADMIN' && formData.role !== 'MASTER'}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Gender {formData.role !== 'ADMIN' && formData.role !== 'MASTER' && '*'}</label>
                            <select
                                value={formData.gender}
                                onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                                className={styles.selectInput}
                                required={formData.role !== 'ADMIN' && formData.role !== 'MASTER'}
                            >
                                <option value="MALE">Male</option>
                                <option value="FEMALE">Female</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Password {!user && <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>(Optional, default: Welcome@123)</span>}</label>
                            <div className={styles.passwordWrapper}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    className={styles.searchInput}
                                    placeholder={user ? "Leave blank to keep current" : "Set password"}
                                />
                                <button
                                    type="button"
                                    className={styles.passwordToggle}
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                            <line x1="1" y1="1" x2="23" y2="23"></line>
                                        </svg>
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Phone</label>
                            <input
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                className={styles.searchInput}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Role</label>
                            <select
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                                className={styles.selectInput}
                            >
                                <option value="STUDENT">STUDENT</option>
                                <option value="COORDINATOR">COORDINATOR</option>
                                <option value="ADMIN">ADMIN</option>
                                <option value="MASTER">MASTER</option>
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>House</label>
                            <select
                                value={formData.houseId}
                                onChange={e => setFormData({ ...formData, houseId: e.target.value })}
                                className={styles.selectInput}
                            >
                                <option value="">None</option>
                                {houses.map(h => (
                                    <option key={h.id} value={h.id}>{h.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Department</label>
                            <input
                                value={formData.department}
                                onChange={e => setFormData({ ...formData, department: e.target.value })}
                                className={styles.searchInput}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Year</label>
                            <input
                                value={formData.semester}
                                onChange={e => setFormData({ ...formData, semester: e.target.value })}
                                className={styles.searchInput}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                        <button type="button" onClick={onClose} className={styles.cancelButton} disabled={isSaving}>Cancel</button>
                        <button type="submit" className={styles.addButton} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '100px', justifyContent: 'center' }}>
                            {isSaving ? <><LoadingSpinner size="18px" /> Saving...</> : (user ? 'Save Changes' : 'Create User')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default function DashboardPage() {
    const modals = useModals()
    const { setIsLoading } = useLoading()
    const { refreshConfig } = useConfig()
    const router = useRouter()
    const [user, setUser] = useState<AuthResponse['user'] | null>(null)
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)

    // Admin State - Volunteers
    const [volunteers, setVolunteers] = useState<any[]>([])
    const [volunteerSearch, setVolunteerSearch] = useState('')
    const [loadingVolunteers, setLoadingVolunteers] = useState(false)
    const [newVolunteerAdmn, setNewVolunteerAdmn] = useState('')

    const loadVolunteers = async () => {
        setLoadingVolunteers(true)
        try {
            const res = await getVolunteers()
            if (res.success && res.data) setVolunteers(res.data)
        } catch (e) {
            console.error(e)
            modals.showToast('Failed to load volunteers', 'error')
        } finally {
            setLoadingVolunteers(false)
        }
    }

    // Admin State - Navigation
    const [activeTab, setActiveTab] = useState<'users' | 'programs' | 'settings' | 'gallery' | 'usermanagement' | 'results' | 'feedbacks' | 'volunteers'>('users')

    useEffect(() => {
        if (activeTab === 'volunteers' && (user?.role === 'ADMIN' || user?.role === 'MASTER')) {
            loadVolunteers()
        }
    }, [activeTab, user])

    // Admin State - Users
    const [adminSearch, setAdminSearch] = useState('')
    const [adminHouse, setAdminHouse] = useState('ALL')
    const [adminDept, setAdminDept] = useState('ALL')
    const [adminProgram, setAdminProgram] = useState('ALL')
    const [onlyRegistered, setOnlyRegistered] = useState(false)
    const [onlyVolunteers, setOnlyVolunteers] = useState(false)
    const [attendanceFilter, setAttendanceFilter] = useState<'ALL' | 'PRESENT' | 'ABSENT' | 'NOT_MARKED'>('ALL')
    const [certStatusFilter, setCertStatusFilter] = useState<'ALL' | 'SENT' | 'NOT_SENT'>('ALL')
    const [adminUsers, setAdminUsers] = useState<any[]>([])
    const [houses, setHouses] = useState<any[]>([])
    const [selectedRegs, setSelectedRegs] = useState<string[]>([])
    const [adminPage, setAdminPage] = useState(1)
    const [certLoading, setCertLoading] = useState(false)
    const [loadingAdmin, setLoadingAdmin] = useState(false)
    // New state for split view
    const [viewMode, setViewMode] = useState<'ADMIN' | 'STUDENT'>('ADMIN')

    // Admin State - Programs
    const [adminPrograms, setAdminPrograms] = useState<Program[]>([])
    const [programSearch, setProgramSearch] = useState('')
    const [programCategoryFilter, setProgramCategoryFilter] = useState<'ALL' | 'ON_STAGE' | 'OFF_STAGE'>('ALL')
    const [programTab, setProgramTab] = useState<'PROGRAMS' | 'COORDINATORS'>('PROGRAMS')
    const [coordinators, setCoordinators] = useState<any[]>([])
    const [allUsers, setAllUsers] = useState<any[]>([])
    const [userSearch, setUserSearch] = useState('')
    const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | 'STUDENT' | 'COORDINATOR' | 'ADMIN' | 'MASTER'>('ALL')
    const [editingUser, setEditingUser] = useState<any | null>(null)
    const [userModalOpen, setUserModalOpen] = useState(false)
    const [programModalOpen, setProgramModalOpen] = useState(false)
    const [editingProgram, setEditingProgram] = useState<any | null>(null)
    const [coordinatorModalOpen, setCoordinatorModalOpen] = useState(false)
    const [coordinatorSearch, setCoordinatorSearch] = useState('')
    const [potentialCoordinators, setPotentialCoordinators] = useState<any[]>([])
    const [searchingCoordinators, setSearchingCoordinators] = useState(false)

    // Admin State - Settings
    const [configs, setConfigs] = useState<Configuration[]>([])
    const [configModalOpen, setConfigModalOpen] = useState(false)
    const [editingConfig, setEditingConfig] = useState<Configuration | null>(null)

    // Admin State - Results
    const [houseScores, setHouseScores] = useState<any[]>([])
    // Admin State - Feedbacks
    const [feedbacks, setFeedbacks] = useState<any[]>([])
    const [loadingFeedbacks, setLoadingFeedbacks] = useState(false)

    useEffect(() => {
        const token = localStorage.getItem('token')
        const userStr = localStorage.getItem('user')

        if (!token || !userStr) {
            router.push('/login')
            return
        }

        try {
            const userData = JSON.parse(userStr)
            setUser(userData)

            // Refresh user data from API to ensure we have latest role/volunteer status
            fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
                .then(res => res.json())
                .then(res => {
                    if (res.success && res.data) {
                        const newUser = { ...userData, ...res.data }
                        // Only update if there are changes to avoid loop/re-render issues if strict mode
                        if (JSON.stringify(newUser) !== JSON.stringify(userData)) {
                            setUser(newUser)
                            localStorage.setItem('user', JSON.stringify(newUser))
                        }
                    }
                })
                .catch(err => console.error('Failed to refresh user data', err))

            if (userData.role === 'ADMIN' || userData.role === 'MASTER' || userData.role === 'COORDINATOR') {
                // Fetch Admin Data
                setIsLoading(true, "Loading Dashboard")
                fetchAdminData(userData)
                getHouses().then(res => {
                    if (res.success && res.data) setHouses(res.data)
                })
                // Also fetch configs initially
                getConfigs().then(res => {
                    if (res.success && res.data) setConfigs(res.data)
                })
            } else {
                // Fetch Student Data
                setIsLoading(true, "Loading Dashboard")
                getDashboardData(userData.id).then(res => {
                    if (res.success && res.data) {
                        setDashboardData(res.data)
                    }
                }).finally(() => {
                    setLoading(false)
                    setIsLoading(false)
                })
            }

            if (userData.role === 'COORDINATOR') {
                getDashboardData(userData.id).then(res => {
                    if (res.success && res.data) setDashboardData(res.data)
                })
            }

        } catch (e) {
            console.error('Failed to parse user data', e)
            router.push('/login')
            setLoading(false)
        }
    }, [router])

    const fetchFeedbacks = async () => {
        const { getFeedbacks } = await import('@/actions/feedback')
        setLoadingFeedbacks(true)
        try {
            const res = await getFeedbacks()
            if (res.success && res.data) setFeedbacks(res.data)
        } catch (e) {
            console.error('Failed to fetch feedbacks', e)
        } finally {
            setLoadingFeedbacks(false)
        }
    }

    const fetchAdminData = async (currentUser?: any, showLoading = true) => {
        const targetUser = currentUser || user
        const isCoordinator = targetUser?.role === 'COORDINATOR'
        if (showLoading) setLoadingAdmin(true)
        try {
            const res = await getUsersForAdmin({
                query: adminSearch,
                houseId: adminHouse,
                department: adminDept,
                programId: adminProgram,
                hasRegistrations: onlyRegistered,
                page: adminPage,
                limit: 50,
                coordinatorId: (isCoordinator && user?.id) ? user.id : undefined,
                attendanceStatus: attendanceFilter,
                certStatus: certStatusFilter,
                isVolunteer: onlyVolunteers
            })
            if (res.success && res.data) {
                setAdminUsers(res.data.users)
            }
        } catch (e) {
            console.error('Failed to fetch users', e)
        } finally {
            setLoading(false)
            setLoadingAdmin(false)
            setIsLoading(false)
        }
    }

    // ... (inside component)

    const handleExport = async (type: 'csv' | 'pdf' | 'excel') => {
        if (!adminUsers.length) return

        const filename = `students_export_${new Date().toISOString().split('T')[0]}`

        const headers = ['Name', 'Admission No', 'Email', 'Department', 'House', 'Registrations']

        // Prepare data for CSV and PDF (Array of Arrays)
        const dataAoA = adminUsers.map(u => {
            const registrationsStr = u.registrations.map((r: any) => {
                let status = 'Absent'
                if (r.attendances?.some((a: any) => a.isPresent)) status = 'Present'
                let certStatus = r.certificates?.some((c: any) => c.emailSent) ? ' [Cert Sent]' : ''
                return `${r.program.name} (${r.program.type}) - ${status}${certStatus}`
            }).join('; ')

            return [
                u.fullName,
                u.studentAdmnNo,
                u.email,
                u.department || '',
                u.house?.name || '',
                registrationsStr
            ]
        })

        if (type === 'csv') {
            const csvContent = [
                headers.join(','),
                ...dataAoA.map(row => row.map(cell => `"${cell || ''}"`).join(','))
            ].join('\n')

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            const url = URL.createObjectURL(blob)
            link.setAttribute('href', url)
            link.setAttribute('download', `${filename}.csv`)
            link.click()
        } else if (type === 'pdf') {
            setIsLoading(true, "Generating Participant PDF")
            try {
                const res = await generateAdminExportPDF(adminUsers)
                if (res.success && res.pdf) {
                    const link = document.createElement('a')
                    link.href = `data:application/pdf;base64,${res.pdf}`
                    link.download = `${filename}.pdf`
                    link.click()
                } else {
                    modals.showToast(res.error || 'Failed to export PDF', 'error')
                }
            } catch (e) {
                modals.showToast('An error occurred during PDF generation', 'error')
            } finally {
                setIsLoading(false)
            }
        } else if (type === 'excel') {
            const schema = [
                { column: 'Name', type: String, value: (student: any) => student.fullName },
                { column: 'Admission No', type: String, value: (student: any) => student.studentAdmnNo },
                { column: 'Email', type: String, value: (student: any) => student.email },
                { column: 'Department', type: String, value: (student: any) => student.department || '' },
                { column: 'House', type: String, value: (student: any) => student.house?.name || '' },
                {
                    column: 'Registrations', type: String, value: (student: any) => student.registrations.map((r: any) => {
                        let status = 'Absent'
                        if (r.attendances?.some((a: any) => a.isPresent)) status = 'Present'
                        let certStatus = r.certificates?.some((c: any) => c.emailSent) ? ' [Cert Sent]' : ''
                        return `${r.program.name} (${r.program.type}) - ${status}${certStatus}`
                    }).join('; ')
                }
            ]

            await writeXlsxFile(adminUsers, {
                schema,
                fileName: `${filename}.xlsx`
            })
        }
    }

    const downloadMyRegistrations = async () => {
        if (!user || !dashboardData) return
        setIsLoading(true, "Generating PDF Summary")
        try {
            const res = await generateStudentRegistrationsPDF(user.id)
            if (res.success && res.pdf) {
                const link = document.createElement('a')
                link.href = `data:application/pdf;base64,${res.pdf}`
                link.download = `registrations_${user.studentAdmnNo}.pdf`
                link.click()
            } else {
                modals.showToast(res.error || 'Failed to generate PDF', 'error')
            }
        } catch (e) {
            modals.showToast('An error occurred during PDF generation', 'error')
        } finally {
            setIsLoading(false)
        }
    }

    // Fetch Data on Tab Change
    useEffect(() => {
        // Fetch house scores for everyone (for leaderboard display)
        import('@/actions/results').then(m => m.getHouseLeaderboard()).then(res => {
            if (res.success && res.data) setHouseScores(res.data)
        })

        if (user?.role !== 'ADMIN' && user?.role !== 'MASTER' && user?.role !== 'COORDINATOR') return

        if (activeTab === 'programs' || activeTab === 'users') {
            getPrograms().then(res => {
                if (res.success && res.data) setAdminPrograms(res.data)
            })
        }

        if (activeTab === 'programs') {
            setIsLoading(true, "Loading Programs")
            getCoordinators().then(res => {
                if (res.success && res.data) setCoordinators(res.data)
                setIsLoading(false)
            })
        } else if (activeTab === 'results') {
            setIsLoading(true, "Loading Leaderboard")
            import('@/actions/results').then(m => m.getHouseLeaderboard()).then(res => {
                if (res.success && res.data) setHouseScores(res.data)
                setIsLoading(false)
            })
            getCoordinators().then(res => {
                if (res.success && res.data) setCoordinators(res.data)
            })
        } else if (activeTab === 'settings') {
            setIsLoading(true, "Loading Settings")
            getConfigs().then(res => {
                if (res.success && res.data) setConfigs(res.data)
                setIsLoading(false)
            })
        } else if (activeTab === 'feedbacks') {
            fetchFeedbacks()
        }
    }, [activeTab, user?.role, coordinatorModalOpen, userModalOpen])

    // --- Program Handlers ---
    const handleSaveProgram = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true, "Saving Program")
        const formData = new FormData(e.currentTarget)
        const data = {
            name: formData.get('name') as string,
            type: formData.get('type') as ProgramType,
            category: formData.get('category') as ProgramCategory,
            minMembers: parseInt(formData.get('minMembers') as string),
            maxMembers: parseInt(formData.get('maxMembers') as string),
            description: formData.get('description') as string,
            coordinatorIds: formData.getAll('coordinatorIds') as string[],
        }

        try {
            if (editingProgram) {
                await updateProgram(editingProgram.id, data)
            } else {
                await createProgram(data)
            }

            // Refresh
            const res = await getPrograms()
            if (res.success && res.data) setAdminPrograms(res.data)
            setProgramModalOpen(false)
            setEditingProgram(null)
        } finally {
            setIsLoading(false)
        }
    }

    // Helper to refresh programs
    const refreshPrograms = async () => {
        const res = await getPrograms()
        if (res.success && res.data) setAdminPrograms(res.data)
    }

    const handleDeleteProgram = (id: string, name: string) => {
        modals.confirm({
            title: 'Delete Program',
            message: `Are you sure you want to delete "${name}"?`,
            confirmText: 'Delete',
            onConfirm: async () => {
                setIsLoading(true, "Deleting Program")
                try {
                    const res = await deleteProgram(id)
                    if (res.success) {
                        modals.showToast('Program deleted successfully', 'success')
                        await refreshPrograms()
                    } else {
                        modals.showToast('Failed to delete program', 'error')
                    }
                } finally {
                    setIsLoading(false)
                }
            }
        })
    }

    // --- Config Handlers ---
    const handleSaveConfig = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const value = formData.get('value') as string

        if (editingConfig) {
            await updateConfig(editingConfig.key, value)
            const res = await getConfigs()
            if (res.success && res.data) setConfigs(res.data)
            setConfigModalOpen(false)
            setEditingConfig(null)
        }
    }

    // Debounce search
    useEffect(() => {
        if ((user?.role === 'ADMIN' || user?.role === 'MASTER' || user?.role === 'VOLUNTEER') && activeTab === 'users') {
            const timer = setTimeout(() => {
                fetchAdminData()
            }, 500)
            return () => clearTimeout(timer)
        }
    }, [adminSearch, adminHouse, adminDept, adminProgram, onlyRegistered, onlyVolunteers, adminPage, user, attendanceFilter, certStatusFilter])

    // Search for potential coordinators
    useEffect(() => {
        if (!coordinatorModalOpen || coordinatorSearch.length < 2) {
            setPotentialCoordinators([])
            return
        }

        const timer = setTimeout(async () => {
            setSearchingCoordinators(true)
            try {
                // We only want students
                const res = await getUsersForAdmin({ query: coordinatorSearch, limit: 10 })
                if (res.success && res.data) {
                    setPotentialCoordinators(res.data.users)
                }
            } finally {
                setSearchingCoordinators(false)
            }
        }, 500)

        return () => clearTimeout(timer)
    }, [coordinatorSearch, coordinatorModalOpen])

    useEffect(() => {
        if (activeTab === 'usermanagement' && user?.role === 'MASTER') {
            const fetchUsers = async () => {
                const res = await getAllUsers({
                    query: userSearch,
                    role: userRoleFilter,
                    limit: 50
                })
                if (res.success && res.data) {
                    setAllUsers(res.data.users)
                }
            }
            fetchUsers()
        }
    }, [activeTab, userSearch, userRoleFilter, user?.role])


    const handleSaveUser = async (data: any) => {
        try {
            setIsLoading(true, editingUser ? "Updating User" : "Creating User")
            let res;
            if (editingUser) {
                res = await updateUser(editingUser.id, data)
            } else {
                res = await createUser(data)
            }

            if (res.success) {
                const fetchRes = await getAllUsers({ query: userSearch, role: userRoleFilter, limit: 50 })
                if (fetchRes.success && fetchRes.data) setAllUsers(fetchRes.data.users)
                setUserModalOpen(false)
                setEditingUser(null)
                modals.showToast(`User ${editingUser ? 'updated' : 'created'} successfully`, 'success')
            } else {
                modals.showToast(`Failed to ${editingUser ? 'update' : 'create'} user: ` + res.error, 'error')
            }
        } finally {
            setIsLoading(false)
        }
    }

    const handleLogout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
        router.push('/login')
    }

    if (loading) return null

    if (!user) return null

    return (
        <div className={`${styles.container} ${inter.className}`}>
            <header className={styles.header}>
                <div>
                    <h1 className={`${styles.title} ${cinzel.className}`}>Dashboard</h1>
                    <p className={styles.welcomeText}>Welcome, <span className={styles.userName}>{user.fullName}</span></p>
                </div>
            </header>

            {/* Visibility Restriction: Only VOLUNTEERs see this dashboard toggle. 
                Normal students (Role: STUDENT) will not see this section. */}
            {user.role === 'VOLUNTEER' && (
                <div className={styles.viewToggleContainer}>
                    <button
                        onClick={() => setViewMode('ADMIN')}
                        className={`${styles.viewToggleBtn} ${viewMode === 'ADMIN' ? styles.active : ''}`}
                    >
                        Volunteer Dashboard
                    </button>
                    <button
                        onClick={() => setViewMode('STUDENT')}
                        className={`${styles.viewToggleBtn} ${viewMode === 'STUDENT' ? styles.active : ''}`}
                    >
                        My Student Profile
                    </button>
                </div>
            )}

            {((user.role === 'ADMIN' || user.role === 'MASTER' || user.role === 'COORDINATOR') || (user.role === 'VOLUNTEER' && viewMode === 'ADMIN')) ? (
                // ADMIN VIEW
                <div className={styles.adminContainer}>
                    {/* Navigation */}
                    <div className={styles.adminNav}>
                        <button
                            className={`${styles.navItem} ${activeTab === 'users' ? styles.active : ''}`}
                            onClick={() => setActiveTab('users')}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            Users & Registrations
                        </button>
                        <button
                            className={`${styles.navItem} ${activeTab === 'results' ? styles.active : ''}`}
                            onClick={() => setActiveTab('results')}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="8" r="7"></circle>
                                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                            </svg>
                            Grades & Results
                        </button>
                        <button
                            className={`${styles.navItem} ${activeTab === 'programs' ? styles.active : ''}`}
                            onClick={() => setActiveTab('programs')}
                            style={{ display: (user.role === 'VOLUNTEER' || user.role === 'COORDINATOR') ? 'none' : 'flex' }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            Program Management
                        </button>
                        {(user.role === 'ADMIN' || user.role === 'MASTER') && (
                            <button
                                className={`${styles.navItem} ${activeTab === 'volunteers' ? styles.active : ''}`}
                                onClick={() => setActiveTab('volunteers')}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                                Volunteers
                            </button>
                        )}
                        {(user.role !== 'VOLUNTEER' && user.role !== 'COORDINATOR') && (
                            <>
                                <button
                                    className={`${styles.navItem} ${activeTab === 'gallery' ? styles.active : ''}`}
                                    onClick={() => setActiveTab('gallery')}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                        <polyline points="21 15 16 10 5 21"></polyline>
                                    </svg>
                                    Gallery Images
                                </button>
                                {user.role === 'MASTER' && (
                                    <button
                                        className={`${styles.navItem} ${activeTab === 'usermanagement' ? styles.active : ''}`}
                                        onClick={() => setActiveTab('usermanagement')}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                        </svg>
                                        User Management
                                    </button>
                                )}
                                <button
                                    className={`${styles.navItem} ${activeTab === 'settings' ? styles.active : ''}`}
                                    onClick={() => setActiveTab('settings')}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="3"></circle>
                                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                    </svg>
                                    Configurations
                                </button>
                                <button
                                    className={`${styles.navItem} ${activeTab === 'feedbacks' ? styles.active : ''}`}
                                    onClick={() => setActiveTab('feedbacks')}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                    </svg>
                                    Feedbacks
                                </button>
                            </>
                        )}
                    </div>

                    {activeTab === 'users' && (
                        <>
                            {/* Admin Profile Card */}
                            <div className={styles.grid}>
                                <div className={styles.card}>
                                    <h2 className={`${styles.cardTitle} ${cinzel.className}`}>Admin Profile</h2>
                                    <div className={styles.infoRow}>
                                        <span className={styles.label}>Name</span>
                                        <span className={styles.value}>{user.fullName}</span>
                                    </div>
                                    <div className={styles.infoRow}>
                                        <span className={styles.label}>Email</span>
                                        <span className={styles.value}>{user.email}</span>
                                    </div>
                                    <div className={styles.infoRow}>
                                        <span className={styles.label}>Role</span>
                                        <span className={styles.value}>{user.role}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Filters */}
                            <div className={styles.filtersSection}>
                                <div className={styles.filterGroup}>
                                    <input
                                        type="text"
                                        placeholder="Search by name, adm no..."
                                        className={styles.searchInput}
                                        value={adminSearch}
                                        onChange={(e) => setAdminSearch(e.target.value)}

                                    />
                                    {(user.role === 'ADMIN' || user.role === 'MASTER' || user.role === 'VOLUNTEER') && (
                                        <select
                                            className={styles.selectInput}
                                            value={attendanceFilter}
                                            onChange={(e) => setAttendanceFilter(e.target.value as any)}
                                        >
                                            <option value="ALL">All Attendance</option>
                                            <option value="PRESENT">Present</option>
                                            <option value="ABSENT">Absent</option>
                                        </select>
                                    )}
                                    {(user.role === 'ADMIN' || user.role === 'MASTER') && (
                                        <select
                                            className={styles.selectInput}
                                            value={certStatusFilter}
                                            onChange={(e) => setCertStatusFilter(e.target.value as any)}
                                        >
                                            <option value="ALL">All Cert Status</option>
                                            <option value="SENT">Cert Sent</option>
                                            <option value="NOT_SENT">Cert Not Sent</option>
                                        </select>
                                    )}
                                    {user.role !== 'VOLUNTEER' && (
                                        <select
                                            className={styles.selectInput}
                                            value={adminHouse}
                                            onChange={(e) => setAdminHouse(e.target.value)}
                                        >
                                            <option value="ALL">All Houses</option>
                                            {houses.map(h => (
                                                <option key={h.id} value={h.id}>{h.name}</option>
                                            ))}
                                        </select>
                                    )}
                                    {user.role !== 'VOLUNTEER' && (
                                        <select
                                            className={styles.selectInput}
                                            value={adminProgram}
                                            onChange={(e) => setAdminProgram(e.target.value)}
                                        >
                                            <option value="ALL">All Programs</option>
                                            {adminPrograms.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    )}
                                    {(user.role !== 'VOLUNTEER' && user.role !== 'COORDINATOR') && (
                                        <label className={styles.checkboxLabel}>
                                            <input
                                                type="checkbox"
                                                checked={onlyRegistered}
                                                onChange={(e) => setOnlyRegistered(e.target.checked)}
                                            />
                                            Has Registrations
                                        </label>
                                    )}

                                    <div className={styles.exportButtons}>
                                        <button onClick={() => handleExport('csv')} className={`${styles.exportButton} ${styles.csv}`} title="Export CSV">
                                            CSV
                                        </button>
                                        <button onClick={() => handleExport('excel')} className={`${styles.exportButton} ${styles.excel}`} title="Export Excel">
                                            XLS
                                        </button>
                                        <button onClick={() => handleExport('pdf')} className={`${styles.exportButton} ${styles.pdf}`} title="Export PDF">
                                            PDF
                                        </button>
                                        {(user?.role === 'ADMIN' || user?.role === 'MASTER') && (
                                            <button
                                                onClick={async () => {
                                                    if (selectedRegs.length === 0) return modals.showToast('Please select at least one student.', 'info');
                                                    modals.confirm({
                                                        title: 'Generate Certificates',
                                                        message: `Generate and send certificates for ${selectedRegs.length} selected items? (Requires SMTP config)`,
                                                        confirmText: 'Generate & Send',
                                                        onConfirm: async () => {
                                                            setCertLoading(true);
                                                            setIsLoading(true, "Mailing Certificates")
                                                            try {
                                                                const { generateAndSendCertificates } = await import('@/actions/certificates');
                                                                const res = await generateAndSendCertificates(selectedRegs);
                                                                if (res.success) {
                                                                    modals.showToast(res.message || 'Certificates processed.', 'success');
                                                                    setSelectedRegs([]);
                                                                } else {
                                                                    modals.showToast(res.error || 'Failed to process certificates.', 'error');
                                                                }
                                                            } finally {
                                                                setCertLoading(false);
                                                                setIsLoading(false);
                                                            }
                                                        }
                                                    })
                                                }}
                                                className={styles.exportButton}
                                                style={{ backgroundColor: 'var(--color-success)', color: 'white', opacity: certLoading ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}
                                                disabled={certLoading}
                                            >
                                                {certLoading ? <><LoadingSpinner size="18px" /> Processing...</> : `Send Certificates (${selectedRegs.length})`}
                                            </button>
                                        )}
                                        <label className={styles.checkboxLabel}>
                                            <input
                                                type="checkbox"
                                                checked={onlyVolunteers}
                                                onChange={(e) => setOnlyVolunteers(e.target.checked)}
                                            />
                                            Volunteers Only
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Users List */}
                            <div className={styles.tableCard}>
                                <h3 className={`${styles.cardTitle} ${cinzel.className}`}>Student Directory</h3>
                                <div className={styles.tableWrapper}>
                                    <table className={styles.userTable}>
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Admission No</th>
                                                <th>House</th>
                                                <th>Registrations</th>
                                                {(user?.role === 'ADMIN' || user?.role === 'MASTER' || user?.role === 'COORDINATOR') && <th>Attendance & Select</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loadingAdmin ? (
                                                <tr><td colSpan={(user?.role === 'ADMIN' || user?.role === 'MASTER' || user?.role === 'COORDINATOR') ? 5 : 4} style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td></tr>
                                            ) : adminUsers.length > 0 ? (
                                                adminUsers.map(u => (
                                                    <tr key={u.id}>
                                                        <td className={styles.tdName}>
                                                            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                {u.fullName}
                                                                {u.isVolunteer && (
                                                                    <span style={{
                                                                        fontSize: '0.65rem',
                                                                        padding: '2px 6px',
                                                                        borderRadius: '10px',
                                                                        background: 'linear-gradient(135deg, #FFD700 0%, #FDB931 100%)',
                                                                        color: '#000',
                                                                        fontWeight: 700,
                                                                        textTransform: 'uppercase',
                                                                        letterSpacing: '0.5px',
                                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                                                    }}>
                                                                        VOLUNTEER
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{u.department}</div>
                                                        </td>
                                                        <td>{u.studentAdmnNo}</td>
                                                        <td>
                                                            {u.house ? (
                                                                <span className={styles.houseBadge} style={{ backgroundColor: u.house.color + '20', color: u.house.color }}>
                                                                    {u.house.name}
                                                                </span>
                                                            ) : '-'}
                                                        </td>
                                                        <td>
                                                            {u.registrations.length > 0 ? (
                                                                <div className={styles.regTags}>
                                                                    {u.registrations.map((r: any) => (
                                                                        <span key={r.id} className={styles.miniTag}>
                                                                            {r.program.name} ({r.program.type === 'GROUP' ? 'G' : 'S'})
                                                                            {r.certificates?.some((c: any) => c.emailSent) && <span style={{ color: '#22c55e', marginLeft: '4px' }} title="Certificate Sent">✓</span>}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span style={{ opacity: 0.5 }}>-</span>
                                                            )}
                                                        </td>
                                                        {(user?.role === 'ADMIN' || user?.role === 'MASTER' || user?.role === 'VOLUNTEER' || user?.role === 'COORDINATOR') && (
                                                            <td>
                                                                {u.registrations.map((r: any) => (
                                                                    <div key={r.id} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '5px' }}>
                                                                        <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                                                                            {r.program.name}:
                                                                            {r.certificates?.some((c: any) => c.emailSent) && <span style={{ color: '#22c55e', marginLeft: '4px' }} title="Certificate Sent">✓</span>}
                                                                        </span>
                                                                        <button
                                                                            onClick={() => {
                                                                                const isPresentNow = r.attendances?.some((a: any) => a.isPresent);
                                                                                const nextState = !isPresentNow;
                                                                                modals.confirm({
                                                                                    title: 'Change Attendance',
                                                                                    message: `Mark ${u.fullName} as ${nextState ? 'PRESENT' : 'ABSENT'} for ${r.program.name}?`,
                                                                                    onConfirm: async () => {
                                                                                        const { markAttendance } = await import('@/actions/coordinator');
                                                                                        const res = await markAttendance(u.id, r.id, r.program.id, user.id, nextState);
                                                                                        if (res.success) {
                                                                                            modals.showToast(`Attendance updated for ${u.fullName}`, 'success')
                                                                                            fetchAdminData()
                                                                                        } else {
                                                                                            modals.showToast('Failed to update attendance.', 'error')
                                                                                        }
                                                                                    }
                                                                                })
                                                                            }}
                                                                            style={{
                                                                                padding: '2px 8px',
                                                                                fontSize: '0.7rem',
                                                                                backgroundColor: r.attendances?.some((a: any) => a.isPresent) ? 'var(--color-success)' : 'var(--border-color)',
                                                                                color: r.attendances?.some((a: any) => a.isPresent) ? 'white' : 'var(--foreground)',
                                                                                border: '1px solid var(--border-color)',
                                                                                borderRadius: '4px',
                                                                                cursor: 'pointer',
                                                                                transition: 'all 0.2s ease'
                                                                            }}
                                                                        >
                                                                            {r.attendances?.some((a: any) => a.isPresent) ? 'Present' : 'Mark'}
                                                                        </button>

                                                                        {/* Checkbox for Certification */}
                                                                        {(user?.role === 'ADMIN' || user?.role === 'MASTER') && r.attendances?.some((a: any) => a.isPresent) && (
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={selectedRegs.includes(r.id)}
                                                                                onChange={(e) => {
                                                                                    if (e.target.checked) {
                                                                                        setSelectedRegs(prev => [...prev, r.id]);
                                                                                    } else {
                                                                                        setSelectedRegs(prev => prev.filter(id => id !== r.id));
                                                                                    }
                                                                                }}
                                                                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                                                title="Select for certificate"
                                                                            />
                                                                        )}

                                                                        {/* Grade Selector for ADMIN/MASTER */}
                                                                        {(user?.role === 'ADMIN' || user?.role === 'MASTER') && r.attendances?.some((a: any) => a.isPresent) && (
                                                                            <select
                                                                                value={r.grade || 'PARTICIPATION'}
                                                                                onChange={async (e) => {
                                                                                    const newGrade = e.target.value;
                                                                                    // Optimistic update
                                                                                    setAdminUsers(prev => prev.map(userItem => {
                                                                                        if (userItem.id === u.id) {
                                                                                            return {
                                                                                                ...userItem,
                                                                                                registrations: userItem.registrations.map((reg: any) => {
                                                                                                    if (reg.id === r.id) return { ...reg, grade: newGrade };
                                                                                                    return reg;
                                                                                                })
                                                                                            };
                                                                                        }
                                                                                        return userItem;
                                                                                    }));

                                                                                    const { updateRegistrationResult, getHouseLeaderboard } = await import('@/actions/results');
                                                                                    const res = await updateRegistrationResult(r.id, newGrade);
                                                                                    if (res.success) {
                                                                                        modals.showToast(`Updated result for ${u.fullName}`, 'success');
                                                                                        fetchAdminData(undefined, false);
                                                                                        const scoreRes = await getHouseLeaderboard();
                                                                                        if (scoreRes.success && scoreRes.data) setHouseScores(scoreRes.data);
                                                                                    }
                                                                                }}
                                                                                style={{
                                                                                    padding: '2px 4px',
                                                                                    fontSize: '0.7rem',
                                                                                    backgroundColor: '#222',
                                                                                    color: 'white',
                                                                                    border: '1px solid #444',
                                                                                    borderRadius: '3px',
                                                                                    cursor: 'pointer'
                                                                                }}
                                                                            >
                                                                                <option value="PARTICIPATION">Participant (0)</option>
                                                                                <option value="WINNER">Winner (5)</option>
                                                                                <option value="FIRST_RUNNER_UP">1st Runner (4)</option>
                                                                                <option value="SECOND_RUNNER_UP">2nd Runner (3)</option>
                                                                            </select>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr><td colSpan={(user?.role === 'ADMIN' || user?.role === 'MASTER' || user?.role === 'VOLUNTEER' || user?.role === 'COORDINATOR') ? 5 : 4} style={{ textAlign: 'center', padding: '2rem' }}>No users found matching filters.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Card View for Users */}
                                <div className={styles.mobileCardList}>
                                    {loadingAdmin ? (
                                        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading users...</div>
                                    ) : adminUsers.length > 0 ? (
                                        adminUsers.map(u => (
                                            <div key={u.id} className={styles.mobileCard}>
                                                <div className={styles.mobileCardHeader}>
                                                    <div>
                                                        <div className={styles.mobileCardTitle}>{u.fullName}</div>
                                                        <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{u.department} • {u.studentAdmnNo}</div>
                                                    </div>
                                                    {u.house && (
                                                        <span className={styles.houseBadge} style={{ backgroundColor: u.house.color + '20', color: u.house.color }}>
                                                            {u.house.name}
                                                        </span>
                                                    )}
                                                </div>

                                                <div style={{ marginTop: '0.8rem' }}>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Registrations:</div>
                                                    {u.registrations.length > 0 ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                                            {u.registrations.map((r: any) => (
                                                                <div key={r.id} style={{
                                                                    padding: '0.8rem',
                                                                    backgroundColor: 'rgba(255,255,255,0.03)',
                                                                    borderRadius: '8px',
                                                                    border: '1px solid rgba(255,255,255,0.05)'
                                                                }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                                        <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                                                                            {r.program.name}
                                                                            {r.certificates?.some((c: any) => c.emailSent) && <span style={{ color: '#22c55e', marginLeft: '8px' }} title="Certificate Sent">✓</span>}
                                                                        </span>
                                                                        <span className={styles.miniTag}>{r.program.type === 'GROUP' ? 'Group' : 'Solo'}</span>
                                                                    </div>

                                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                                                                        {(user?.role === 'ADMIN' || user?.role === 'MASTER' || user?.role === 'VOLUNTEER' || user?.role === 'COORDINATOR') && (
                                                                            <button
                                                                                onClick={() => {
                                                                                    const isPresentNow = r.attendances?.some((a: any) => a.isPresent);
                                                                                    const nextState = !isPresentNow;
                                                                                    modals.confirm({
                                                                                        title: 'Change Attendance',
                                                                                        message: `Mark ${u.fullName} as ${nextState ? 'PRESENT' : 'ABSENT'} for ${r.program.name}?`,
                                                                                        onConfirm: async () => {
                                                                                            const { markAttendance } = await import('@/actions/coordinator');
                                                                                            const res = await markAttendance(u.id, r.id, r.program.id, user.id, nextState);
                                                                                            if (res.success) {
                                                                                                modals.showToast(`Attendance updated for ${u.fullName}`, 'success')
                                                                                                fetchAdminData()
                                                                                            } else {
                                                                                                modals.showToast('Failed to update attendance.', 'error')
                                                                                            }
                                                                                        }
                                                                                    })
                                                                                }}
                                                                                style={{
                                                                                    padding: '4px 10px',
                                                                                    fontSize: '0.75rem',
                                                                                    backgroundColor: r.attendances?.some((a: any) => a.isPresent) ? 'var(--color-success)' : 'var(--border-color)',
                                                                                    color: r.attendances?.some((a: any) => a.isPresent) ? 'white' : 'var(--foreground)',
                                                                                    border: '1px solid var(--border-color)',
                                                                                    borderRadius: '4px',
                                                                                    cursor: 'pointer'
                                                                                }}
                                                                            >
                                                                                {r.attendances?.some((a: any) => a.isPresent) ? 'Present' : 'Mark Presence'}
                                                                            </button>
                                                                        )}

                                                                        {(user?.role === 'ADMIN' || user?.role === 'MASTER') && r.attendances?.some((a: any) => a.isPresent) && (
                                                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                                                <select
                                                                                    value={r.grade || 'PARTICIPATION'}
                                                                                    onChange={async (e) => {
                                                                                        const newGrade = e.target.value;
                                                                                        // Optimistic update
                                                                                        setAdminUsers(prev => prev.map(userItem => {
                                                                                            if (userItem.id === u.id) {
                                                                                                return {
                                                                                                    ...userItem,
                                                                                                    registrations: userItem.registrations.map((reg: any) => {
                                                                                                        if (reg.id === r.id) return { ...reg, grade: newGrade };
                                                                                                        return reg;
                                                                                                    })
                                                                                                };
                                                                                            }
                                                                                            return userItem;
                                                                                        }));

                                                                                        const { updateRegistrationResult, getHouseLeaderboard } = await import('@/actions/results');
                                                                                        const res = await updateRegistrationResult(r.id, newGrade);
                                                                                        if (res.success) {
                                                                                            modals.showToast(`Updated result for ${u.fullName}`, 'success');
                                                                                            fetchAdminData(undefined, false);
                                                                                            const scoreRes = await getHouseLeaderboard();
                                                                                            if (scoreRes.success && scoreRes.data) setHouseScores(scoreRes.data);
                                                                                        }
                                                                                    }}
                                                                                    style={{
                                                                                        padding: '4px',
                                                                                        fontSize: '0.75rem',
                                                                                        backgroundColor: '#222',
                                                                                        color: 'white',
                                                                                        border: '1px solid #444',
                                                                                        borderRadius: '4px'
                                                                                    }}
                                                                                >
                                                                                    <option value="PARTICIPATION">Participant</option>
                                                                                    <option value="WINNER">Winner</option>
                                                                                    <option value="FIRST_RUNNER_UP">1st Runner</option>
                                                                                    <option value="SECOND_RUNNER_UP">2nd Runner</option>
                                                                                </select>
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={selectedRegs.includes(r.id)}
                                                                                    onChange={(e) => {
                                                                                        if (e.target.checked) setSelectedRegs(prev => [...prev, r.id]);
                                                                                        else setSelectedRegs(prev => prev.filter(id => id !== r.id));
                                                                                    }}
                                                                                    style={{ width: '18px', height: '18px' }}
                                                                                />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div style={{ opacity: 0.5, fontSize: '0.85rem' }}>No registrations found.</div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>No users found matching filters.</div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                    {activeTab === 'results' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
                            {/* House Leaderboard */}
                            <div className={styles.tableCard}>
                                <h3 className={`${styles.cardTitle} ${cinzel.className}`}>House Leaderboard</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                                    {houseScores.length > 0 ? (
                                        houseScores.map((h, idx) => {
                                            const maxScore = Math.max(...houseScores.map(x => x.score)) || 1;
                                            const percentage = (h.score / maxScore) * 100;

                                            return (
                                                <div key={h.id} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '1.5rem',
                                                    padding: '1rem',
                                                    backgroundColor: 'rgba(255,255,255,0.03)',
                                                    borderRadius: '12px',
                                                    borderLeft: `4px solid ${h.color || 'var(--primary-red)'}`
                                                }}>
                                                    <div style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        borderRadius: '50%',
                                                        backgroundColor: idx === 0 ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255,255,255,0.1)',
                                                        color: idx === 0 ? '#ffd700' : 'white',
                                                        fontWeight: 'bold',
                                                        fontSize: '1.2rem'
                                                    }}>
                                                        {idx + 1}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                            <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{h.name}</span>
                                                            <span style={{ fontWeight: 700, color: h.color || 'white' }}>{h.score} pts</span>
                                                        </div>
                                                        <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                                            <div style={{
                                                                width: `${percentage}%`,
                                                                height: '100%',
                                                                backgroundColor: h.color || 'var(--primary-red)',
                                                                transition: 'width 1s ease-out'
                                                            }} />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>
                                            {loadingAdmin ? 'Calculating scores...' : 'No scores recorded yet.'}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Scoring Rules */}
                            <div className={styles.tableCard}>
                                <h3 className={`${styles.cardTitle} ${cinzel.className}`}>Scoring Rules</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                                    {[
                                        { label: 'Winner (1st)', points: 5, color: '#ffd700' },
                                        { label: 'First Runner Up (2nd)', points: 4, color: '#c0c0c0' },
                                        { label: 'Second Runner Up (3rd)', points: 3, color: '#cd7f32' },
                                        { label: 'Participation', points: 0, color: 'var(--color-success)' }
                                    ].map((rule, i) => (
                                        <div key={i} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '1rem',
                                            backgroundColor: 'rgba(255,255,255,0.03)',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(255,255,255,0.1)'
                                        }}>
                                            <span style={{ fontWeight: 500 }}>{rule.label}</span>
                                            <span style={{
                                                padding: '0.3rem 0.8rem',
                                                backgroundColor: rule.color + '20',
                                                color: rule.color,
                                                borderRadius: '20px',
                                                fontSize: '0.9rem',
                                                fontWeight: 600,
                                                border: `1px solid ${rule.color}40`
                                            }}>
                                                {rule.points} Points
                                            </span>
                                        </div>
                                    ))}
                                    <div style={{
                                        marginTop: '1rem',
                                        padding: '1rem',
                                        backgroundColor: 'rgba(0,0,0,0.2)',
                                        borderRadius: '8px',
                                        fontSize: '0.85rem',
                                        lineHeight: 1.5,
                                        opacity: 0.8,
                                        border: '1px solid rgba(255,255,255,0.05)'
                                    }}>
                                        <strong>Rules:</strong>
                                        <ul style={{ margin: '0.5rem 0 0 1.2rem' }}>
                                            <li>Points are awarded per program.</li>
                                            <li>A student must be marked <strong>Present</strong> to receive any points.</li>
                                            <li>Group events earn points as a single entry for the House.</li>
                                            <li>Participation points (0) do not contribute to the total score.</li>
                                            <li>House scores are updated in real-time as results are assigned.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}



                    {activeTab === 'programs' && (
                        <>
                            <div className={styles.innerNav}>
                                <button className={`${styles.innerNavBtn} ${programTab === 'PROGRAMS' ? styles.active : ''}`} onClick={() => setProgramTab('PROGRAMS')}>Programs</button>
                                <button className={`${styles.innerNavBtn} ${programTab === 'COORDINATORS' ? styles.active : ''}`} onClick={() => setProgramTab('COORDINATORS')}>Coordinators</button>
                            </div>

                            {programTab === 'PROGRAMS' && (
                                <div className={styles.tableCard}>
                                    <div className={styles.crudHeader} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                            <h3 className={`${styles.cardTitle} ${cinzel.className}`} style={{ marginBottom: 0 }}>Programs Management</h3>
                                            <button className={styles.addButton} onClick={() => { setEditingProgram(null); setProgramModalOpen(true) }}>
                                                + Add Program
                                            </button>
                                        </div>

                                        {/* Program Toolbar */}
                                        <div style={{ display: 'flex', gap: '1rem', width: '100%', flexWrap: 'wrap', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                                            <input
                                                type="text"
                                                placeholder="Search programs..."
                                                className={styles.searchInput}
                                                value={programSearch}
                                                onChange={(e) => setProgramSearch(e.target.value)}
                                                style={{ flex: 1, minWidth: '200px' }}
                                            />

                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                {['ALL', 'ON_STAGE', 'OFF_STAGE'].map(cat => (
                                                    <button
                                                        key={cat}
                                                        onClick={() => setProgramCategoryFilter(cat as any)}
                                                        className={styles.navItem}
                                                        style={{
                                                            padding: '0.5rem 1rem',
                                                            fontSize: '0.85rem',
                                                            borderRadius: '6px',
                                                            backgroundColor: programCategoryFilter === cat ? 'var(--primary-red)' : 'transparent',
                                                            color: programCategoryFilter === cat ? 'white' : 'inherit',
                                                            borderColor: programCategoryFilter === cat ? 'transparent' : 'var(--border-color)'
                                                        }}
                                                    >
                                                        {cat.replace('_', ' ')}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.tableWrapper}>
                                        <table className={styles.userTable}>
                                            <thead>
                                                <tr>
                                                    <th>Name</th>
                                                    <th>Type</th>
                                                    <th>Category</th>
                                                    <th>Members (Min/Max)</th>
                                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {adminPrograms
                                                    .filter(p => {
                                                        const matchesSearch = p.name.toLowerCase().includes(programSearch.toLowerCase());
                                                        const matchesCategory = programCategoryFilter === 'ALL' || p.category === programCategoryFilter;
                                                        return matchesSearch && matchesCategory;
                                                    })
                                                    .length > 0 ? (
                                                    adminPrograms
                                                        .filter(p => {
                                                            const matchesSearch = p.name.toLowerCase().includes(programSearch.toLowerCase());
                                                            const matchesCategory = programCategoryFilter === 'ALL' || p.category === programCategoryFilter;
                                                            return matchesSearch && matchesCategory;
                                                        })
                                                        .map(p => (
                                                            <tr key={p.id} className={styles.tableRowHover}>
                                                                <td className={styles.tdName}>
                                                                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                                                                    {p.description && <div style={{ fontSize: '0.8rem', opacity: 0.7, maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.description}</div>}
                                                                </td>
                                                                <td>
                                                                    <span className={styles.miniTag} style={{
                                                                        backgroundColor: p.type === 'SOLO' ? '#e3f2fd' : '#f3e5f5',
                                                                        color: p.type === 'SOLO' ? '#1976d2' : '#7b1fa2'
                                                                    }}>
                                                                        {p.type}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <span className={styles.miniTag} style={{
                                                                        backgroundColor: p.category === 'ON_STAGE' ? '#fff3e0' : '#e8f5e9',
                                                                        color: p.category === 'ON_STAGE' ? '#e65100' : '#2e7d32'
                                                                    }}>
                                                                        {p.category.replace('_', ' ')}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                        <span style={{ fontWeight: 500 }}>{p.minMembers}</span>
                                                                        <span style={{ opacity: 0.5 }}>-</span>
                                                                        <span style={{ fontWeight: 500 }}>{p.maxMembers}</span>
                                                                    </div>
                                                                </td>
                                                                <td className={styles.actionButtons} style={{ justifyContent: 'flex-end' }}>
                                                                    <button className={styles.editBtn} onClick={() => { setEditingProgram(p); setProgramModalOpen(true) }}>Edit</button>
                                                                    <button className={styles.deleteBtn} onClick={() => handleDeleteProgram(p.id, p.name)}>Delete</button>
                                                                </td>
                                                            </tr>
                                                        ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={5} style={{ textAlign: 'center', padding: '3rem' }}>
                                                            <div style={{ opacity: 0.6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                                                    <circle cx="12" cy="12" r="10"></circle>
                                                                    <line x1="12" y1="8" x2="12" y2="12"></line>
                                                                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                                                </svg>
                                                                <span>No programs found matching your filters.</span>
                                                                <button
                                                                    onClick={() => { setProgramSearch(''); setProgramCategoryFilter('ALL') }}
                                                                    style={{ marginTop: '0.5rem', background: 'transparent', border: 'none', color: 'var(--primary-red)', cursor: 'pointer', textDecoration: 'underline' }}
                                                                >
                                                                    Clear Filters
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>

                                        {/* Mobile Card View for Programs */}
                                        <div className={styles.mobileCardList}>
                                            {adminPrograms
                                                .filter(p => {
                                                    const matchesSearch = p.name.toLowerCase().includes(programSearch.toLowerCase());
                                                    const matchesCategory = programCategoryFilter === 'ALL' || p.category === programCategoryFilter;
                                                    return matchesSearch && matchesCategory;
                                                }).length > 0 ? (
                                                adminPrograms
                                                    .filter(p => {
                                                        const matchesSearch = p.name.toLowerCase().includes(programSearch.toLowerCase());
                                                        const matchesCategory = programCategoryFilter === 'ALL' || p.category === programCategoryFilter;
                                                        return matchesSearch && matchesCategory;
                                                    })
                                                    .map(p => (
                                                        <div key={p.id} className={styles.mobileCard}>
                                                            <div className={styles.mobileCardHeader}>
                                                                <div className={styles.mobileCardTitle}>{p.name}</div>
                                                                <span className={styles.miniTag} style={{
                                                                    backgroundColor: p.type === 'SOLO' ? '#e3f2fd' : '#f3e5f5',
                                                                    color: p.type === 'SOLO' ? '#1976d2' : '#7b1fa2',
                                                                    padding: '0.2rem 0.5rem',
                                                                    borderRadius: '4px',
                                                                    fontSize: '0.75rem'
                                                                }}>
                                                                    {p.type}
                                                                </span>
                                                            </div>
                                                            {p.description && (
                                                                <div style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '0.8rem' }}>
                                                                    {p.description}
                                                                </div>
                                                            )}
                                                            <div className={styles.mobileCardRow}>
                                                                <span style={{ opacity: 0.7 }}>Category:</span>
                                                                <span className={styles.miniTag} style={{
                                                                    backgroundColor: p.category === 'ON_STAGE' ? '#fff3e0' : '#e8f5e9',
                                                                    color: p.category === 'ON_STAGE' ? '#e65100' : '#2e7d32',
                                                                    padding: '0.2rem 0.5rem',
                                                                    borderRadius: '4px',
                                                                    fontSize: '0.75rem'
                                                                }}>
                                                                    {p.category.replace('_', ' ')}
                                                                </span>
                                                            </div>
                                                            <div className={styles.mobileCardRow}>
                                                                <span style={{ opacity: 0.7 }}>Members:</span>
                                                                <span style={{ fontWeight: 500 }}>{p.minMembers} - {p.maxMembers}</span>
                                                            </div>
                                                            <div className={styles.mobileCardActions}>
                                                                <button className={styles.editBtn} onClick={() => { setEditingProgram(p); setProgramModalOpen(true) }}>Edit</button>
                                                                <button className={styles.deleteBtn} onClick={() => handleDeleteProgram(p.id, p.name)}>Delete</button>
                                                            </div>
                                                        </div>
                                                    ))
                                            ) : (
                                                <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>No programs found.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Coordinator Management Section */}
                            {programTab === 'COORDINATORS' && (
                                <div className={styles.tableCard}>
                                    <div className={styles.crudHeader}>
                                        <h3 className={`${styles.cardTitle} ${cinzel.className}`}>Coordinator Management</h3>
                                        <button className={styles.addButton} onClick={() => { setCoordinatorSearch(''); setCoordinatorModalOpen(true) }}>
                                            + Add Coordinator
                                        </button>
                                    </div>
                                    <div className={styles.tableWrapper}>
                                        <table className={styles.userTable}>
                                            <thead>
                                                <tr>
                                                    <th>Name</th>
                                                    <th>Email</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {coordinators.map(v => (
                                                    <tr key={v.id}>
                                                        <td className={styles.tdName} style={{ fontWeight: 600 }}>{v.fullName}</td>
                                                        <td>{v.email}</td>
                                                        <td className={styles.actionButtons}>
                                                            <button
                                                                className={styles.deleteBtn}
                                                                onClick={() => {
                                                                    modals.confirm({
                                                                        title: 'Remove Coordinator',
                                                                        message: `Remove coordinator status from ${v.fullName}?`,
                                                                        onConfirm: async () => {
                                                                            setIsLoading(true, "Removing Coordinator Badge")
                                                                            try {
                                                                                const res = await updateUserRole(v.id, 'STUDENT')
                                                                                if (res.success) {
                                                                                    modals.showToast('Coordinator removed', 'success')
                                                                                    const vRes = await getCoordinators()
                                                                                    if (vRes.success && vRes.data) setCoordinators(vRes.data)
                                                                                }
                                                                            } finally {
                                                                                setIsLoading(false)
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            >
                                                                Remove
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {coordinators.length === 0 && (
                                                    <tr><td colSpan={3} style={{ textAlign: 'center', padding: '1rem', opacity: 0.6 }}>No coordinators added yet.</td></tr>
                                                )}
                                            </tbody>
                                        </table>

                                        {/* Mobile Card View for Coordinators */}
                                        <div className={styles.mobileCardList}>
                                            {coordinators.map(v => (
                                                <div key={v.id} className={styles.mobileCard}>
                                                    <div className={styles.mobileCardHeader}>
                                                        <div className={styles.mobileCardTitle}>{v.fullName}</div>
                                                    </div>
                                                    <div style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '0.8rem' }}>
                                                        {v.email}
                                                    </div>
                                                    <div className={styles.mobileCardActions}>
                                                        <button
                                                            className={styles.deleteBtn}
                                                            onClick={() => {
                                                                modals.confirm({
                                                                    title: 'Remove Coordinator',
                                                                    message: `Remove coordinator status from ${v.fullName}?`,
                                                                    onConfirm: async () => {
                                                                        const res = await updateUserRole(v.id, 'STUDENT')
                                                                        if (res.success) {
                                                                            modals.showToast('Coordinator removed', 'success')
                                                                            const vRes = await getCoordinators()
                                                                            if (vRes.success && vRes.data) setCoordinators(vRes.data)
                                                                        }
                                                                    }
                                                                })
                                                            }}
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {coordinators.length === 0 && (
                                                <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>No coordinators added yet.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {
                        activeTab === 'settings' && (
                            <div>
                                <div className={styles.crudHeader}>
                                    <h3 className={`${styles.cardTitle} ${cinzel.className}`}>System Configuration</h3>
                                    {user?.role === 'MASTER' && (
                                        <button className={styles.addButton} onClick={() => { setEditingConfig(null); setConfigModalOpen(true) }}>
                                            + Create Config
                                        </button>
                                    )}
                                </div>
                                <div className={styles.configGrid}>
                                    {configs.map(c => {
                                        // 1. Try to parse as JSON Array
                                        let isJsonArray = false;
                                        let jsonArray: string[] = [];
                                        try {
                                            if (c.value.trim().startsWith('[') && c.value.trim().endsWith(']')) {
                                                const parsed = JSON.parse(c.value);
                                                if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
                                                    isJsonArray = true;
                                                    jsonArray = parsed;
                                                }
                                            }
                                        } catch (e) { }

                                        // 2. Standard Single Value Logic
                                        const isUrl = typeof c.value === 'string' && (c.value.startsWith('http://') || c.value.startsWith('https://'));
                                        const isImage = isUrl && c.value.match(/\.(jpeg|jpg|gif|png|webp|bmp|svg)$/i);
                                        const isPdf = isUrl && c.value.match(/\.pdf$/i);

                                        return (
                                            <div key={c.id} className={styles.configCard}>
                                                <div>
                                                    <div className={styles.configKey}>{c.key}</div>
                                                    <div className={styles.configDesc}>{c.description || 'No description provided.'}</div>
                                                </div>
                                                <div className={styles.configValueContainer} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                                                    {isJsonArray ? (
                                                        <div style={{ width: '100%' }}>
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                                {jsonArray.map((url, idx) => {
                                                                    const isItemImage = url.match(/\.(jpeg|jpg|gif|png|webp|bmp|svg)$/i);
                                                                    return (
                                                                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', aspectRatio: '1', borderRadius: '4px', overflow: 'hidden', border: '1px solid #eee', position: 'relative' }}>
                                                                            {isItemImage ? (
                                                                                <img src={url} alt={`Item ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                            ) : (
                                                                                <div style={{ width: '100%', height: '100%', backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#666' }}>
                                                                                    FILE
                                                                                </div>
                                                                            )}

                                                                            {r.certificates?.some((c: any) => c.emailSent) && (
                                                                                <span
                                                                                    style={{
                                                                                        fontSize: '0.65rem',
                                                                                        color: 'var(--color-success)',
                                                                                        backgroundColor: 'rgba(var(--color-success-rgb, 25, 135, 84), 0.1)',
                                                                                        padding: '1px 4px',
                                                                                        borderRadius: '3px',
                                                                                        border: '1px solid var(--color-success)',
                                                                                        fontWeight: 600
                                                                                    }}
                                                                                    title="Certificate successfully sent via email"
                                                                                >
                                                                                    Sent
                                                                                </span>
                                                                            )}
                                                                        </a>
                                                                    )
                                                                })}
                                                            </div>
                                                            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{jsonArray.length} items</div>
                                                        </div>
                                                    ) : isImage ? (
                                                        <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem', width: '100%' }}>
                                                            <div style={{
                                                                position: 'relative',
                                                                width: '100%',
                                                                height: '200px',
                                                                borderRadius: '8px',
                                                                overflow: 'hidden',
                                                                backgroundColor: '#f5f5f5',
                                                                border: '1px solid #e0e0e0',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}>
                                                                <img
                                                                    src={c.value}
                                                                    alt={c.key}
                                                                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                                                    onError={(e) => {
                                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                                        const parent = (e.target as HTMLImageElement).parentElement;
                                                                        if (parent) {
                                                                            parent.innerHTML = '<div style="padding:1rem; text-align:center; color:#666; font-size:0.8rem">Image preview failed</div>';
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                            <div style={{ fontSize: '0.75rem', opacity: 0.7, wordBreak: 'break-all', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                                                                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '70%' }}>{c.value.split('/').pop()}</span>
                                                                <a href={c.value} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-red)', textDecoration: 'underline', fontWeight: 600 }}>View Image</a>
                                                            </div>
                                                        </div>
                                                    ) : isUrl ? (
                                                        <div style={{ width: '100%' }}>
                                                            <a
                                                                href={c.value}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '0.75rem',
                                                                    padding: '0.75rem',
                                                                    backgroundColor: 'rgba(0,0,0,0.03)',
                                                                    borderRadius: '6px',
                                                                    textDecoration: 'none',
                                                                    color: 'inherit',
                                                                    border: '1px solid rgba(0,0,0,0.1)',
                                                                    transition: 'background 0.2s'
                                                                }}
                                                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.06)'}
                                                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.03)'}
                                                            >
                                                                {isPdf ? (
                                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                        <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                                        <path d="M14 2V8H20" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                                        <path d="M16 13H8" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                                        <path d="M16 17H8" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                                        <path d="M10 9H8" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                                    </svg>
                                                                ) : (
                                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                                                                        <polyline points="13 2 13 9 20 9"></polyline>
                                                                    </svg>
                                                                )}
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                        {c.value.split('/').pop()}
                                                                    </div>
                                                                    <div style={{ fontSize: '0.8rem', opacity: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                        {c.value}
                                                                    </div>
                                                                </div>
                                                                <span style={{ fontSize: '0.8rem', color: 'var(--primary-red)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                                    {isPdf ? 'View PDF' : 'Open Link'}
                                                                </span>
                                                            </a>
                                                        </div>
                                                    ) : (
                                                        <span className={styles.configValue} style={{ wordBreak: 'break-all', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                            {c.value}
                                                        </span>
                                                    )}
                                                    <button className={styles.editConfigBtn} onClick={() => { setEditingConfig(c); setConfigModalOpen(true) }}>Edit Change</button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )
                    }

                    {/* Gallery Tab */}
                    {
                        activeTab === 'gallery' && (
                            <div>
                                <div className={styles.crudHeader}>
                                    <h3 className={`${styles.cardTitle} ${cinzel.className}`}>Gallery Management</h3>
                                    <div style={{ position: 'relative', overflow: 'hidden' }}>
                                        <button className={styles.addButton}>
                                            + Upload Images
                                        </button>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                            onChange={async (e) => {
                                                if (e.target.files && e.target.files.length > 0) {
                                                    const files = Array.from(e.target.files)

                                                    try {
                                                        setIsLoading(true, "Uploading images...")

                                                        // Upload all files concurrently
                                                        const uploadPromises = files.map(async (file) => {
                                                            const formData = new FormData()
                                                            formData.append('file', file)
                                                            const res = await fetch('/api/upload', {
                                                                method: 'POST',
                                                                body: formData
                                                            })
                                                            return res.json()
                                                        })

                                                        const results = await Promise.all(uploadPromises)
                                                        const newUrls = results
                                                            .filter(r => r.success)
                                                            .map(r => r.url)

                                                        if (newUrls.length > 0) {
                                                            // Update config
                                                            const currentConfig = configs.find(c => c.key === 'galleryImages')
                                                            let images: string[] = []
                                                            if (currentConfig && currentConfig.value) {
                                                                try {
                                                                    images = JSON.parse(currentConfig.value)
                                                                } catch (e) {
                                                                    images = []
                                                                }
                                                            }
                                                            // Prepend new images
                                                            const updatedImages = [...newUrls, ...images]

                                                            await updateConfig('galleryImages', JSON.stringify(updatedImages))
                                                            // Refresh configs
                                                            const newConfigs = await getConfigs()
                                                            if (newConfigs.success && newConfigs.data) setConfigs(newConfigs.data)
                                                        }

                                                        if (newUrls.length < files.length) {
                                                            modals.showToast(`Uploaded ${newUrls.length} of ${files.length} images. Some failed.`, 'info')
                                                        } else {
                                                            modals.showToast('All images uploaded successfully', 'success')
                                                        }
                                                    } catch (err) {
                                                        console.error(err)
                                                        modals.showToast('Upload process failed', 'error')
                                                    } finally {
                                                        setIsLoading(false)
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className={styles.configGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                                    {(() => {
                                        const galleryConfig = configs.find(c => c.key === 'galleryImages')
                                        let images: string[] = []
                                        if (galleryConfig) {
                                            try {
                                                const parsed = JSON.parse(galleryConfig.value)
                                                if (Array.isArray(parsed)) images = parsed
                                            } catch (e) { }
                                        }

                                        if (images.length === 0) return <p style={{ opacity: 0.6 }}>No images in gallery. Upload one to start.</p>

                                        return images.map((img, idx) => (
                                            <div key={idx} className={styles.card} style={{ padding: '0.5rem', position: 'relative' }}>
                                                <div style={{ aspectRatio: '16/9', position: 'relative', width: '100%', borderRadius: '4px', overflow: 'hidden', background: '#eee' }}>
                                                    <img src={img} alt="Gallery" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        modals.confirm({
                                                            title: 'Delete Image',
                                                            message: 'Are you sure you want to delete this image?',
                                                            confirmText: 'Delete',
                                                            onConfirm: async () => {
                                                                const newImages = images.filter((_, i) => i !== idx)
                                                                setIsLoading(true, "Deleting Image")
                                                                await updateConfig('galleryImages', JSON.stringify(newImages))
                                                                const newConfigs = await getConfigs()
                                                                if (newConfigs.success && newConfigs.data) setConfigs(newConfigs.data)
                                                                modals.showToast('Image deleted successfully', 'success')
                                                                setIsLoading(false)
                                                            }
                                                        })
                                                    }}
                                                    className={styles.deleteBtn}
                                                    style={{ position: 'absolute', top: '10px', right: '10px', padding: '4px 8px', fontSize: '0.7rem' }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        ))
                                    })()}
                                </div>
                            </div>
                        )
                    }

                    {/* Volunteers Tab */}
                    {
                        activeTab === 'volunteers' && (
                            <div>
                                <div className={styles.crudHeader}>
                                    <h3 className={`${styles.cardTitle} ${cinzel.className}`}>Student Volunteers</h3>
                                </div>

                                {/* Add Volunteer Section */}
                                <div className={styles.card} style={{ marginBottom: '1.5rem' }}>
                                    <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Add New Volunteer</h4>
                                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                        <input
                                            placeholder="Student Admission Number"
                                            className={styles.searchInput}
                                            value={newVolunteerAdmn}
                                            onChange={(e) => setNewVolunteerAdmn(e.target.value)}
                                            style={{ flex: 1, minWidth: '200px' }}
                                        />
                                        <button
                                            className={styles.addButton}
                                            disabled={loadingVolunteers || !newVolunteerAdmn.trim()}
                                            onClick={async () => {
                                                if (!newVolunteerAdmn.trim()) return
                                                setLoadingVolunteers(true)
                                                try {
                                                    const res = await addVolunteer(newVolunteerAdmn)
                                                    if (res.success) {
                                                        modals.showToast('Volunteer added successfully', 'success')
                                                        setNewVolunteerAdmn('')
                                                        await loadVolunteers()
                                                    } else {
                                                        modals.showToast(res.error || 'Failed to add volunteer', 'error')
                                                    }
                                                } finally {
                                                    setLoadingVolunteers(false)
                                                }
                                            }}
                                        >
                                            {loadingVolunteers ? <LoadingSpinner size="16px" /> : '+ Add Volunteer'}
                                        </button>
                                    </div>
                                    <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.5rem' }}>
                                        Enter the admission number of the student you wish to mark as a volunteer.
                                        This will not change their role but will grant them a volunteer badge.
                                    </p>
                                </div>

                                {/* Volunteers List */}
                                <div className={styles.tableCard}>
                                    <div className={styles.tableWrapper}>
                                        <table className={styles.userTable}>
                                            <thead>
                                                <tr>
                                                    <th>Name</th>
                                                    <th>Admission No</th>
                                                    <th>Department</th>
                                                    <th>House</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {volunteers.map((v: any) => (
                                                    <tr key={v.id}>
                                                        <td className={styles.tdName}>
                                                            <div style={{ fontWeight: 600 }}>{v.fullName}</div>
                                                            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{v.email}</div>
                                                        </td>
                                                        <td>{v.studentAdmnNo}</td>
                                                        <td>{v.department || '-'}</td>
                                                        <td>
                                                            {v.House ? (
                                                                <span style={{
                                                                    color: v.House.color || 'inherit',
                                                                    fontWeight: 600,
                                                                    border: `1px solid ${v.House.color || 'transparent'}`,
                                                                    padding: '2px 8px',
                                                                    borderRadius: '12px',
                                                                    fontSize: '0.8rem'
                                                                }}>
                                                                    {v.House.name}
                                                                </span>
                                                            ) : '-'}
                                                        </td>
                                                        <td className={styles.actionButtons}>
                                                            <button
                                                                className={styles.deleteBtn}
                                                                onClick={() => {
                                                                    modals.confirm({
                                                                        title: 'Remove Volunteer',
                                                                        message: `Are you sure you want to remove ${v.fullName} from volunteers?`,
                                                                        onConfirm: async () => {
                                                                            setLoadingVolunteers(true)
                                                                            try {
                                                                                const res = await removeVolunteer(v.id)
                                                                                if (res.success) {
                                                                                    modals.showToast('Volunteer removed', 'success')
                                                                                    await loadVolunteers()
                                                                                } else {
                                                                                    modals.showToast(res.error || 'Failed to remove volunteer', 'error')
                                                                                }
                                                                            } finally {
                                                                                setLoadingVolunteers(false)
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            >
                                                                Remove
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {volunteers.length === 0 && !loadingVolunteers && (
                                                    <tr>
                                                        <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>
                                                            No student volunteers found.
                                                        </td>
                                                    </tr>
                                                )}
                                                {loadingVolunteers && volunteers.length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                                                            Loading...
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    {/* Program Modal */}
                    {
                        programModalOpen && (
                            <div className={styles.modalOverlay}>
                                <div className={styles.adminModal}>
                                    <h2 className={`${styles.cardTitle} ${cinzel.className}`}>
                                        {editingProgram ? 'Edit Program' : 'Add New Program'}
                                    </h2>
                                    <form onSubmit={handleSaveProgram}>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>Program Name</label>
                                            <input name="name" defaultValue={editingProgram?.name} className={styles.searchInput} required />
                                        </div>
                                        <div className={styles.formGrid}>
                                            <div>
                                                <label className={styles.formLabel}>Type</label>
                                                <select name="type" defaultValue={editingProgram?.type || 'SOLO'} className={styles.selectInput}>
                                                    <option value="SOLO">SOLO</option>
                                                    <option value="GROUP">GROUP</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className={styles.formLabel}>Category</label>
                                                <select name="category" defaultValue={editingProgram?.category || 'ON_STAGE'} className={styles.selectInput}>
                                                    <option value="ON_STAGE">ON STAGE</option>
                                                    <option value="OFF_STAGE">OFF STAGE</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className={styles.formLabel}>Min Members</label>
                                                <input type="number" name="minMembers" defaultValue={editingProgram?.minMembers || 1} className={styles.searchInput} required />
                                            </div>
                                            <div>
                                                <label className={styles.formLabel}>Max Members</label>
                                                <input type="number" name="maxMembers" defaultValue={editingProgram?.maxMembers || 1} className={styles.searchInput} required />
                                            </div>
                                        </div>
                                        <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                                            <label className={styles.formLabel}>Description</label>
                                            <textarea name="description" defaultValue={editingProgram?.description || ''} className={styles.searchInput} style={{ minHeight: '80px' }} />
                                        </div>
                                        <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                                            <label className={styles.formLabel}>Assign Coordinators</label>
                                            <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #444', padding: '0.5rem', borderRadius: '4px' }}>
                                                {coordinators.map(v => (
                                                    <div key={`${v.id}-${editingProgram?.id || 'new'}`} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                        <input
                                                            type="checkbox"
                                                            name="coordinatorIds"
                                                            value={v.id}
                                                            defaultChecked={editingProgram?.coordinators?.some((pv: any) => pv.id === v.id)}
                                                            style={{ transform: 'scale(1.2)', marginRight: '0.5rem' }}
                                                        />
                                                        <span>{v.fullName}</span>
                                                    </div>
                                                ))}
                                                {coordinators.length === 0 && <span style={{ opacity: 0.5 }}>No coordinators found.</span>}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                                            <button type="button" onClick={() => setProgramModalOpen(false)} className={styles.cancelButton}>Cancel</button>
                                            <button type="submit" className={styles.addButton} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {/* Button content handled by parent state for simplicity or just plain text if fast */}
                                                Save Program
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )
                    }

                    {/* Config Modal */}
                    {
                        configModalOpen && (
                            <ConfigurationModal
                                isOpen={configModalOpen}
                                config={editingConfig}
                                onClose={() => setConfigModalOpen(false)}
                                onSave={async (data) => {
                                    if (editingConfig) {
                                        await updateConfig(data.key, data.value, data.description)
                                    } else {
                                        await createConfig({ key: data.key, value: data.value, description: data.description })
                                    }
                                    await refreshConfig() // Refresh app context properly
                                    const res = await getConfigs()
                                    if (res.success && res.data) {
                                        setConfigs(res.data)
                                    }
                                    setConfigModalOpen(false)
                                    setEditingConfig(null)
                                }}
                                onDelete={user?.role === 'MASTER' ? async (key) => {
                                    setIsLoading(true, "Deleting Configuration")
                                    try {
                                        await deleteConfig(key)
                                        await refreshConfig()
                                        const res = await getConfigs()
                                        if (res.success && res.data) setConfigs(res.data)
                                        setConfigModalOpen(false)
                                        setEditingConfig(null)
                                    } finally {
                                        setIsLoading(false)
                                    }
                                } : undefined}
                            />
                        )
                    }

                    {/* Add Coordinator Modal */}
                    {
                        coordinatorModalOpen && (
                            <div className={styles.modalOverlay}>
                                <div className={styles.adminModal}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h2 className={`${styles.cardTitle} ${cinzel.className}`}>Add Coordinator</h2>
                                        <button onClick={() => setCoordinatorModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                                    </div>
                                    <p style={{ marginBottom: '1rem', fontSize: '0.9rem', opacity: 0.8 }}>Search for a student to promote to Coordinator status.</p>

                                    <input
                                        type="text"
                                        placeholder="Search student name or admission no..."
                                        className={styles.searchInput}
                                        style={{ width: '100%', marginBottom: '1rem' }}
                                        value={coordinatorSearch}
                                        onChange={(e) => setCoordinatorSearch(e.target.value)}
                                        autoFocus
                                    />

                                    <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                                        {searchingCoordinators ? (
                                            <div style={{ padding: '1rem', textAlign: 'center' }}>Searching...</div>
                                        ) : potentialCoordinators.length > 0 ? (
                                            potentialCoordinators.map(u => (
                                                <div key={u.id} style={{
                                                    padding: '0.8rem',
                                                    borderBottom: '1px solid var(--border-color)',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}>
                                                    <div>
                                                        <div style={{ fontWeight: 600 }}>{u.fullName}</div>
                                                        <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{u.studentAdmnNo} • {u.department}</div>
                                                    </div>
                                                    <button
                                                        className={styles.addButton}
                                                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                                        onClick={() => {
                                                            modals.confirm({
                                                                title: 'Promote to Coordinator',
                                                                message: `Promote ${u.fullName} to Coordinator?`,
                                                                confirmText: 'Promote',
                                                                onConfirm: async () => {
                                                                    setIsLoading(true, "Promoting to Coordinator")
                                                                    try {
                                                                        await updateUserRole(u.id, 'COORDINATOR')
                                                                        modals.showToast(`${u.fullName} promoted to Coordinator`, 'success')
                                                                        const res = await getCoordinators()
                                                                        if (res.success && res.data) setCoordinators(res.data)
                                                                        setCoordinatorModalOpen(false)
                                                                    } finally {
                                                                        setIsLoading(false)
                                                                    }
                                                                }
                                                            })
                                                        }}
                                                    >
                                                        Promote
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{ padding: '1rem', textAlign: 'center', opacity: 0.6 }}>Start typing...</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    {/* User Modal */}
                    {userModalOpen && (
                        <UserModal
                            isOpen={userModalOpen}
                            user={editingUser}
                            houses={houses}
                            onClose={() => { setUserModalOpen(false); setEditingUser(null) }}
                            onSave={handleSaveUser}
                        />
                    )}

                    {/* User Management Section */}
                    {activeTab === 'usermanagement' && user?.role === 'MASTER' && (
                        <div className={styles.tableCard}>
                            <div className={styles.crudHeader} style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                                <h3 className={`${styles.cardTitle} ${cinzel.className}`}>User Management</h3>

                                {/* Toolbar */}
                                <div style={{ display: 'flex', gap: '1rem', width: '100%', flexWrap: 'wrap', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                                    <input
                                        type="text"
                                        placeholder="Search users..."
                                        className={styles.searchInput}
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                        style={{ flex: 1, minWidth: '200px' }}
                                    />
                                    <button
                                        className={styles.addButton}
                                        onClick={() => { setEditingUser(null); setUserModalOpen(true) }}
                                        style={{ height: '42px', padding: '0 1.5rem' }}
                                    >
                                        + Add User
                                    </button>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {['ALL', 'STUDENT', 'VOLUNTEER', 'ADMIN', 'MASTER'].map(role => (
                                            <button
                                                key={role}
                                                onClick={() => setUserRoleFilter(role as any)}
                                                className={styles.navItem}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    fontSize: '0.85rem',
                                                    borderRadius: '6px',
                                                    backgroundColor: userRoleFilter === role ? 'var(--primary-red)' : 'transparent',
                                                    color: userRoleFilter === role ? 'white' : 'inherit',
                                                    borderColor: userRoleFilter === role ? 'transparent' : 'var(--border-color)'
                                                }}
                                            >
                                                {role.charAt(0) + role.slice(1).toLowerCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className={styles.tableWrapper}>
                                <table className={styles.userTable}>
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Email / Admission No</th>
                                            <th>Role</th>
                                            <th>House</th>
                                            <th style={{ textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allUsers.length > 0 ? (
                                            allUsers.map(u => (
                                                <tr key={u.id} className={styles.tableRowHover}>
                                                    <td className={styles.tdName} style={{ fontWeight: 600 }}>{u.fullName}</td>
                                                    <td>
                                                        <div>{u.email}</div>
                                                        <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{u.studentAdmnNo || '-'}</div>
                                                    </td>
                                                    <td>
                                                        <span className={`${styles.roleBadge} ${styles[`roleBadge_${u.role}`]}`}>
                                                            {u.role}
                                                        </span>
                                                    </td>
                                                    <td>{u.house?.name || '-'}</td>
                                                    <td className={styles.actionButtons} style={{ justifyContent: 'flex-end' }}>
                                                        <button
                                                            className={styles.editBtn}
                                                            onClick={() => { setEditingUser(u); setUserModalOpen(true) }}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            className={styles.deleteBtn}
                                                            onClick={() => {
                                                                modals.confirm({
                                                                    title: 'Delete User',
                                                                    message: `Are you sure you want to delete ${u.fullName}? This action cannot be undone.`,
                                                                    confirmText: 'Delete',
                                                                    onConfirm: async () => {
                                                                        const res = await deleteUser(u.id)
                                                                        if (res.success) {
                                                                            modals.showToast('User deleted successfully', 'success')
                                                                            const fetchRes = await getAllUsers({ query: userSearch, role: userRoleFilter, limit: 50 })
                                                                            if (fetchRes.success && fetchRes.data) setAllUsers(fetchRes.data.users)
                                                                        } else {
                                                                            modals.showToast('Failed to delete user.', 'error')
                                                                        }
                                                                    }
                                                                })
                                                            }}
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>No users found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>

                                {/* Mobile Card View for User Management */}
                                <div className={styles.mobileCardList}>
                                    {allUsers.length > 0 ? (
                                        allUsers.map(u => (
                                            <div key={u.id} className={styles.mobileCard}>
                                                <div className={styles.mobileCardHeader}>
                                                    <div className={styles.mobileCardTitle}>{u.fullName}</div>
                                                    <span className={`${styles.roleBadge} ${styles[`roleBadge_${u.role}`]}`}>
                                                        {u.role}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '0.5rem' }}>
                                                    <div>{u.email}</div>
                                                    <div style={{ opacity: 0.6 }}>{u.studentAdmnNo || 'No Admission No'}</div>
                                                </div>
                                                <div style={{ fontSize: '0.85rem', marginBottom: '0.8rem' }}>
                                                    <span style={{ opacity: 0.6 }}>House: </span>
                                                    <span style={{ fontWeight: 500 }}>{u.house?.name || '-'}</span>
                                                </div>
                                                <div className={styles.mobileCardActions}>
                                                    <button
                                                        className={styles.editBtn}
                                                        onClick={() => { setEditingUser(u); setUserModalOpen(true) }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        className={styles.deleteBtn}
                                                        onClick={() => {
                                                            modals.confirm({
                                                                title: 'Delete User',
                                                                message: `Are you sure you want to delete ${u.fullName}? This action cannot be undone.`,
                                                                confirmText: 'Delete',
                                                                onConfirm: async () => {
                                                                    const res = await deleteUser(u.id)
                                                                    if (res.success) {
                                                                        modals.showToast('User deleted successfully', 'success')
                                                                        const fetchRes = await getAllUsers({ query: userSearch, role: userRoleFilter, limit: 50 })
                                                                        if (fetchRes.success && fetchRes.data) setAllUsers(fetchRes.data.users)
                                                                    } else {
                                                                        modals.showToast('Failed to delete user.', 'error')
                                                                    }
                                                                }
                                                            })
                                                        }}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>No users found.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'feedbacks' && (
                        <div className={styles.tableCard}>
                            <div className={styles.crudHeader}>
                                <h3 className={`${styles.cardTitle} ${cinzel.className}`}>Student Feedbacks & Inquiries</h3>
                                <button
                                    className={styles.exportButton}
                                    onClick={fetchFeedbacks}
                                    style={{ backgroundColor: 'var(--primary-gold)', color: 'black' }}
                                    disabled={loadingFeedbacks}
                                >
                                    {loadingFeedbacks ? 'Loading...' : 'Refresh'}
                                </button>
                            </div>
                            <div className={styles.tableWrapper}>
                                <table className={styles.userTable}>
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>From</th>
                                            <th>Subject</th>
                                            <th>Message</th>
                                            <th>Category</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {feedbacks.length > 0 ? (
                                            feedbacks.map(f => (
                                                <tr key={f.id}>
                                                    <td style={{ fontSize: '0.8rem', opacity: 0.7 }}>{new Date(f.createdAt).toLocaleDateString()}</td>
                                                    <td>
                                                        <div style={{ fontWeight: 600 }}>{f.name}</div>
                                                        <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{f.email}</div>
                                                    </td>
                                                    <td style={{ fontWeight: 500 }}>{f.subject}</td>
                                                    <td style={{ maxWidth: '300px', fontSize: '0.9rem' }}>{f.message}</td>
                                                    <td>
                                                        <span className={styles.roleBadge} style={{ backgroundColor: f.category === 'CONTACT' ? 'var(--color-info)' : 'var(--color-warning)' }}>
                                                            {f.category}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>No feedbacks received yet.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>

                                {/* Mobile Card View for Feedback */}
                                <div className={styles.mobileCardList}>
                                    {feedbacks.length > 0 ? (
                                        feedbacks.map(f => (
                                            <div key={f.id} className={styles.mobileCard}>
                                                <div className={styles.mobileCardHeader}>
                                                    <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{new Date(f.createdAt).toLocaleDateString()}</div>
                                                    <span className={styles.roleBadge} style={{ backgroundColor: f.category === 'CONTACT' ? 'var(--color-info)' : 'var(--color-warning)' }}>
                                                        {f.category}
                                                    </span>
                                                </div>
                                                <div style={{ margin: '0.8rem 0' }}>
                                                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{f.subject}</div>
                                                    <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '0.3rem' }}>{f.message}</div>
                                                </div>
                                                <div style={{ paddingTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>
                                                    <div style={{ fontWeight: 600 }}>{f.name}</div>
                                                    <div style={{ opacity: 0.6 }}>{f.email}</div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>No feedbacks received yet.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                // STUDENT VIEW
                <>
                    <div className={styles.actionSection}>
                        <button
                            onClick={() => router.push('/programs')}
                            className={styles.browseButton}
                        >
                            <span>Browse & Register for Programs</span>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M12 5L19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>

                    <div className={styles.grid}>
                        {/* Profile Card */}
                        <div className={styles.card} style={{ position: 'relative' }}>
                            <h2 className={`${styles.cardTitle} ${cinzel.className}`}>Profile Details</h2>
                            {user.isVolunteer && (
                                <div style={{
                                    position: 'absolute',
                                    top: '1rem',
                                    right: '1rem',
                                    background: 'linear-gradient(135deg, #FFD700 0%, #FDB931 100%)',
                                    padding: '6px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 8px rgba(255, 215, 0, 0.4)',
                                    cursor: 'help'
                                }} title="Student Volunteer">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#000" stroke="none">
                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                                    </svg>
                                </div>
                            )}
                            <div className={styles.infoRow}>
                                <span className={styles.label}>Admission No</span>
                                <span className={styles.value}>{user.studentAdmnNo}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.label}>Email</span>
                                <span className={styles.value}>{user.email}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.label}>Department</span>
                                <span className={styles.value}>{user.department || '-'}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.label}>Year</span>
                                <span className={styles.value}>{user.semester || '-'}</span>
                            </div>
                            {user.house && (
                                <div className={styles.infoRow}>
                                    <span className={styles.label}>House</span>
                                    <span className={styles.value} style={{ color: user.house.color }}>
                                        {user.house.name}
                                    </span>
                                </div>
                            )}

                        </div>

                        {/* Registration Limits Card */}
                        {dashboardData && (
                            <div className={styles.card}>
                                <h2 className={`${styles.cardTitle} ${cinzel.className}`}>Registration Status</h2>

                                <div className={styles.paramsList}>
                                    <div className={styles.paramItem}>
                                        <div className={styles.paramHeader}>
                                            <span className={styles.label}>On Stage (Solo)</span>
                                            <span className={styles.value}>{dashboardData.counts.onStageSolo} / {dashboardData.limits.maxOnStageSolo}</span>
                                        </div>
                                        <div className={styles.progressBar}>
                                            <div
                                                className={styles.progressFill}
                                                style={{ width: `${Math.min((dashboardData.counts.onStageSolo / dashboardData.limits.maxOnStageSolo) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className={styles.paramItem}>
                                        <div className={styles.paramHeader}>
                                            <span className={styles.label}>On Stage (Group)</span>
                                            <span className={styles.value}>{dashboardData.counts.onStageGroup} / {dashboardData.limits.maxOnStageGroup}</span>
                                        </div>
                                        <div className={styles.progressBar}>
                                            <div
                                                className={styles.progressFill}
                                                style={{ width: `${Math.min((dashboardData.counts.onStageGroup / dashboardData.limits.maxOnStageGroup) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className={styles.paramItem}>
                                        <div className={styles.paramHeader}>
                                            <span className={styles.label}>Off Stage (Total)</span>
                                            <span className={styles.value}>{dashboardData.counts.offStageTotal} / {dashboardData.limits.maxOffStageTotal}</span>
                                        </div>
                                        <div className={styles.progressBar}>
                                            <div
                                                className={styles.progressFill}
                                                style={{ width: `${Math.min((dashboardData.counts.offStageTotal / dashboardData.limits.maxOffStageTotal) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Registered Programs List */}
                        {dashboardData && (
                            <div className={styles.card} style={{ gridColumn: '1 / -1' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                                    <h2 className={`${styles.cardTitle} ${cinzel.className}`} style={{ marginBottom: 0 }}>My Registrations</h2>
                                    {dashboardData.registrations.length > 0 && (
                                        <button onClick={downloadMyRegistrations} className={styles.exportButton} style={{ backgroundColor: 'var(--primary-red)' }}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            Download PDF
                                        </button>
                                    )}
                                </div>
                                {dashboardData.registrations.length > 0 ? (
                                    <div className={styles.registrationsList}>
                                        {dashboardData.registrations.map(reg => (
                                            <div key={reg.id} className={styles.regItem}>
                                                <div className={styles.regHeader}>
                                                    <span className={styles.programName}>{reg.program.name}</span>
                                                    <div className={styles.badgeRow}>
                                                        {reg.isGroup && (
                                                            <span className={`${styles.roleBadge} ${reg.userId === user.id ? styles.roleLeader : styles.roleMember}`}>
                                                                {reg.userId === user.id ? 'Leader' : 'Member'}
                                                            </span>
                                                        )}
                                                        <span className={`${styles.statusBadge} ${styles[reg.status.toLowerCase()]}`}>
                                                            {reg.status}
                                                        </span>
                                                        {reg.grade && (
                                                            <span className={styles.statusBadge} style={{ backgroundColor: 'var(--color-success)', color: 'white' }}>
                                                                {reg.grade.replace(/_/g, ' ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className={styles.regMeta}>
                                                    <span>{reg.program.category.replace('_', ' ')}</span>
                                                    <span>•</span>
                                                    <span>{reg.program.type}</span>
                                                    {reg.isGroup && reg.groupName && (
                                                        <>
                                                            <span>•</span>
                                                            <span>Team: {reg.groupName}</span>
                                                        </>
                                                    )}
                                                    {reg.isGroup && reg.userId !== user.id && reg.user && (
                                                        <>
                                                            <span>•</span>
                                                            <span>Member</span>
                                                        </>
                                                    )}
                                                </div>
                                                {reg.isGroup && reg.groupMembers && reg.groupMembers.length > 0 && (
                                                    <div className={styles.groupMembersList}>
                                                        <p className={styles.groupMembersLabel}>Team Members:</p>
                                                        <div className={styles.membersContainer}>
                                                            {reg.groupMembers.map((member: any) => (
                                                                <span key={member.user.studentAdmnNo} className={styles.memberBadge}>
                                                                    {member.user.fullName}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className={styles.label}>No registrations yet.</p>
                                )}
                            </div>
                        )}

                        {/* House Leaderboard Card for Students */}
                        <div className={styles.card}>
                            <h2 className={`${styles.cardTitle} ${cinzel.className}`}>House Standings</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1rem' }}>
                                {houseScores.length > 0 ? (
                                    houseScores.map((h, idx) => (
                                        <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <span style={{ fontWeight: 700, opacity: 0.5, width: '20px' }}>#{idx + 1}</span>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '2px' }}>
                                                    <span>{h.name}</span>
                                                    <span style={{ fontWeight: 600 }}>{h.score}</span>
                                                </div>
                                                <div style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                                                    <div style={{
                                                        height: '100%',
                                                        backgroundColor: h.color || 'var(--primary-red)',
                                                        width: `${(h.score / (Math.max(...houseScores.map(x => x.score)) || 1)) * 100}%`,
                                                        borderRadius: '2px'
                                                    }} />
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>Leaderboard loading...</p>
                                )}
                            </div>
                        </div>

                        {/* Role specific cards */}
                        {(user.role === 'ADMIN' || user.role === 'MASTER') && (
                            <div className={styles.card}>
                                <h2 className={`${styles.cardTitle} ${cinzel.className}`}>Admin Controls</h2>
                                <p className={styles.label}>Access admin functionality via the sidebar.</p>
                            </div>
                        )}
                    </div>
                </>
            )
            }
            <div style={{ textAlign: 'center', padding: '2rem 0', opacity: 0.5, fontSize: '0.8rem' }}>
                ArtsFest v{APP_VERSION}
            </div>
        </div >
    )
}
