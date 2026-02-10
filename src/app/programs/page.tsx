'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Cinzel, Inter } from 'next/font/google'
import styles from './programs.module.css'
import { getPrograms, registerForProgramsBatch, getUserRegistrations } from '@/actions/programs'
import { getHouseMembers } from '@/actions/users'
import { AuthResponse } from '@/types'
import { Program, Registration } from '@prisma/client'
import { useLoading } from '@/context/LoadingContext'
import LoadingSpinner from '@/components/LoadingSpinner'

type SearchUser = {
    id: string
    fullName: string
    studentAdmnNo: string
    department: String | null
}

const cinzel = Cinzel({ subsets: ['latin'] })
const inter = Inter({ subsets: ['latin'] })

// Limit constants
const LIMITS = {
    ON_STAGE_SOLO: 4,
    ON_STAGE_GROUP: 2,
    OFF_STAGE_TOTAL: 3
}

export default function ProgramsPage() {
    const router = useRouter()
    const [user, setUser] = useState<AuthResponse['user'] | null>(null)
    const [programs, setPrograms] = useState<Program[]>([])
    const { setIsLoading } = useLoading()
    const [filter, setFilter] = useState<'ALL' | 'ON_STAGE' | 'OFF_STAGE'>('ALL')
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'SOLO' | 'GROUP'>('ALL')
    const [existingRegistrations, setExistingRegistrations] = useState<any[]>([])

    // Batch selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [groupConfigs, setGroupConfigs] = useState<Record<string, { groupName: string, memberIds: string[] }>>({})

    // Modal state for fine-tuning group registration
    const [editingGroupProgram, setEditingGroupProgram] = useState<Program | null>(null)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [tempTeamName, setTempTeamName] = useState('')
    const [tempSelectedMemberIds, setTempSelectedMemberIds] = useState<Set<string>>(new Set())

    // UI state
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null)

    // Group members state for modal
    const [availableMembers, setAvailableMembers] = useState<SearchUser[]>([])
    const [filteredMembers, setFilteredMembers] = useState<SearchUser[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [isLoadingMembers, setIsLoadingMembers] = useState(false)
    const [registering, setRegistering] = useState(false)

    useEffect(() => {
        const token = localStorage.getItem('token')
        const userStr = localStorage.getItem('user')

        if (token && userStr) {
            try {
                const userData = JSON.parse(userStr)
                if (userData.role === 'ADMIN' || userData.role === 'MASTER') {
                    router.push('/dashboard')
                    return
                }
                setUser(userData)
                loadInitialData(userData.id)
            } catch (e) {
                console.error('Failed to parse user', e)
            }
        } else {
            router.push('/login')
        }
    }, [router])

    async function loadInitialData(userId: string) {
        setIsLoading(true, "Fetching programs")
        try {
            const [progRes, regRes] = await Promise.all([
                getPrograms(),
                getUserRegistrations(userId)
            ])
            if (progRes.success && progRes.data) setPrograms(progRes.data)
            if (regRes.success && regRes.data) setExistingRegistrations(regRes.data)
        } catch (e) {
            console.error('Failed to load data', e)
        } finally {
            setIsLoading(false)
        }
    }

    const isRegistered = (programId: string) => existingRegistrations.some(r => r.programId === programId)

    const toggleProgramSelection = (program: Program) => {
        const newSelectedIds = new Set(selectedIds)
        if (newSelectedIds.has(program.id)) {
            newSelectedIds.delete(program.id)
            if (program.type === 'GROUP') {
                const newConfigs = { ...groupConfigs }
                delete newConfigs[program.id]
                setGroupConfigs(newConfigs)
            }
        } else {
            // Block selection if limit reached
            const currentCounts = getCounts()
            if (program.category === 'ON_STAGE') {
                if (program.type === 'SOLO' && currentCounts.osSolo >= LIMITS.ON_STAGE_SOLO) return
                if (program.type === 'GROUP' && currentCounts.osGroup >= LIMITS.ON_STAGE_GROUP) return
            } else {
                if (currentCounts.offT >= LIMITS.OFF_STAGE_TOTAL) return
            }

            if (program.type === 'GROUP') {
                // Open modal for group configuration before adding
                handleGroupConfigClick(program)
                return
            }
            newSelectedIds.add(program.id)
        }
        setSelectedIds(newSelectedIds)
        setMessage(null)
    }

    const handleGroupConfigClick = async (program: Program) => {
        setEditingGroupProgram(program)
        const existingConfig = groupConfigs[program.id]
        setTempTeamName(existingConfig?.groupName || '')
        setTempSelectedMemberIds(new Set(existingConfig?.memberIds || []))
        setSearchQuery('')
        setMessage(null)

        if (user?.house?.id) {
            setIsLoadingMembers(true)
            try {
                const res = await getHouseMembers(user.house.id, user.id)
                if (res.success && res.data) {
                    setAvailableMembers(res.data as SearchUser[])
                    setFilteredMembers(res.data as SearchUser[])
                }
            } finally {
                setIsLoadingMembers(false)
            }
        }
    }

    const saveGroupConfig = () => {
        if (!editingGroupProgram) return

        if (!tempTeamName.trim()) {
            setMessage({ type: 'error', text: 'Team name is required' })
            return
        }

        const teamSize = 1 + tempSelectedMemberIds.size
        if (teamSize < editingGroupProgram.minMembers || teamSize > editingGroupProgram.maxMembers) {
            setMessage({ type: 'error', text: `Requires ${editingGroupProgram.minMembers}-${editingGroupProgram.maxMembers} members.` })
            return
        }

        setGroupConfigs({
            ...groupConfigs,
            [editingGroupProgram.id]: {
                groupName: tempTeamName,
                memberIds: Array.from(tempSelectedMemberIds)
            }
        })

        // Verify limit one last time for groups
        if (!selectedIds.has(editingGroupProgram.id)) {
            const currentCounts = getCounts()
            if (editingGroupProgram.category === 'ON_STAGE') {
                if (currentCounts.osGroup >= LIMITS.ON_STAGE_GROUP) {
                    setMessage({ type: 'error', text: 'On-Stage Group limit reached!' })
                    return
                }
            } else {
                if (currentCounts.offT >= LIMITS.OFF_STAGE_TOTAL) {
                    setMessage({ type: 'error', text: 'Off-Stage limit reached!' })
                    return
                }
            }
        }

        const newSelectedIds = new Set(selectedIds)
        newSelectedIds.add(editingGroupProgram.id)
        setSelectedIds(newSelectedIds)
        setEditingGroupProgram(null)
    }

    const handleBatchRegister = () => {
        if (!user || selectedIds.size === 0) return
        setShowConfirmModal(true)
    }

    const confirmRegistration = async () => {
        if (!user || selectedIds.size === 0) return

        setIsLoading(true, "Processing batch registration")
        setMessage(null)
        setShowConfirmModal(false)

        const payload = Array.from(selectedIds).map(id => {
            const p = programs.find(prog => prog.id === id)!
            return {
                programId: id,
                isGroup: p.type === 'GROUP',
                groupName: groupConfigs[id]?.groupName,
                groupMemberIds: groupConfigs[id]?.memberIds
            }
        })

        try {
            setRegistering(true)
            const res = await registerForProgramsBatch(user.id, payload)
            if (res.success) {
                setMessage({ type: 'success', text: 'Successfully registered for all selected items!' })
                setSelectedIds(new Set())
                setGroupConfigs({})
                loadInitialData(user.id)
            } else {
                setMessage({ type: 'error', text: res.error || 'Registration failed' })
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'An unexpected error occurred.' })
        } finally {
            setIsLoading(false)
            setRegistering(false)
        }
    }

    // Limit calculations
    const getCounts = () => {
        let osSolo = 0, osGroup = 0, offT = 0

        // Count existing
        existingRegistrations.forEach(r => {
            if (r.program.category === 'ON_STAGE') {
                if (r.program.type === 'SOLO') osSolo++
                else osGroup++
            } else offT++
        })

        // Add pending selection
        selectedIds.forEach(id => {
            const p = programs.find(prog => prog.id === id)
            if (!p) return
            if (p.category === 'ON_STAGE') {
                if (p.type === 'SOLO') osSolo++
                else osGroup++
            } else offT++
        })

        return { osSolo, osGroup, offT }
    }

    const counts = getCounts()
    const filteredPrograms = programs.filter(p => {
        const categoryMatch = filter === 'ALL' || p.category === filter
        const typeMatch = typeFilter === 'ALL' || p.type === typeFilter
        return categoryMatch && typeMatch
    })

    if (programs.length === 0) return null

    return (
        <div className={`${styles.container} ${inter.className}`}>
            <header className={styles.header}>
                <div>
                    <h1 className={`${styles.title} ${cinzel.className}`}>Program Selection</h1>
                    <button onClick={() => router.push('/dashboard')} className={styles.backButton}>
                        &larr; Back to Dashboard
                    </button>
                </div>
                <div className={styles.limitGrid}>
                    <div className={styles.limitItem}>On-Stage Solo: {counts.osSolo}/{LIMITS.ON_STAGE_SOLO}</div>
                    <div className={styles.limitItem}>On-Stage Group: {counts.osGroup}/{LIMITS.ON_STAGE_GROUP}</div>
                    <div className={styles.limitItem}>Off-Stage Total: {counts.offT}/{LIMITS.OFF_STAGE_TOTAL}</div>
                </div>
            </header>

            <div className={styles.filterSection}>
                <div className={styles.filterRow}>
                    <span className={styles.filterLabel}>Category:</span>
                    <div className={styles.filters}>
                        {['ALL', 'ON_STAGE', 'OFF_STAGE'].map(f => (
                            <button key={f}
                                className={`${styles.filterButton} ${filter === f ? styles.active : ''}`}
                                onClick={() => setFilter(f as any)}>{f.replace('_', ' ')}</button>
                        ))}
                    </div>
                </div>

                <div className={styles.filterRow}>
                    <span className={styles.filterLabel}>Type:</span>
                    <div className={styles.filters}>
                        {['ALL', 'SOLO', 'GROUP'].map(f => (
                            <button key={f}
                                className={`${styles.filterButton} ${typeFilter === f ? styles.active : ''}`}
                                onClick={() => setTypeFilter(f as any)}>{f}</button>
                        ))}
                    </div>
                </div>
            </div>

            <div className={styles.grid}>
                {filteredPrograms.map((program, index) => {
                    const registered = isRegistered(program.id)
                    const selected = selectedIds.has(program.id)

                    const isLimitReached = () => {
                        if (program.category === 'ON_STAGE') {
                            return program.type === 'SOLO' ? counts.osSolo >= LIMITS.ON_STAGE_SOLO : counts.osGroup >= LIMITS.ON_STAGE_GROUP
                        }
                        return counts.offT >= LIMITS.OFF_STAGE_TOTAL
                    }
                    const limitReached = isLimitReached()

                    return (
                        <div key={program.id} className={`${styles.card} ${selected ? styles.selectedCard : ''} ${registered ? styles.registeredCard : ''} animate-fade-in`} style={{ animationDelay: `${index * 50}ms` }}>
                            <div className={styles.cardHeader}>
                                <h3 className={`${styles.programName} ${cinzel.className}`}>{program.name}</h3>
                                <div className={styles.badgeRow}>
                                    <span className={styles.programType}>{program.type}</span>
                                    {registered && <span className={styles.registeredBadge}>Registered</span>}
                                </div>
                            </div>
                            <p className={styles.description}>{program.description || 'Participate and score points for your house!'}</p>

                            <div className={styles.cardFooter}>
                                <div className={styles.meta}>
                                    {program.type === 'GROUP' && <span>{program.minMembers}-{program.maxMembers} members</span>}
                                </div>

                                {!registered && (
                                    <div className={styles.selectionZone}>
                                        {program.type === 'GROUP' && selected && (
                                            <button className={styles.configBtn} onClick={() => handleGroupConfigClick(program)}>⚙ Edit Team</button>
                                        )}
                                        <button
                                            className={`${styles.selectBtn} ${selected ? styles.selectedBtn : ''}`}
                                            onClick={() => toggleProgramSelection(program)}
                                            disabled={!selected && limitReached}
                                        >
                                            {selected ? 'Added' : limitReached ? 'Limit Reached' : (program.type === 'GROUP' ? 'Setup Team' : 'Select')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {selectedIds.size > 0 && (
                <div className={styles.floatingBar}>
                    <div className={styles.selectionSummary}>
                        <strong>{selectedIds.size}</strong> items selected
                    </div>
                    <button className={styles.batchRegisterBtn} onClick={handleBatchRegister} disabled={registering}>
                        {registering ? 'Processing...' : 'Register Selected Items'}
                    </button>
                </div>
            )}

            {message && (
                <div className={`${styles.messageToast} ${styles[message.type]}`}>
                    {message.text}
                </div>
            )}

            {/* Group Configuration Modal */}
            {editingGroupProgram && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h2 className={cinzel.className}>Team Configuration: {editingGroupProgram.name}</h2>
                        {message?.type === 'error' && <p className={styles.errorMessage}>{message.text}</p>}

                        <div className={styles.inputGroup}>
                            <label className={styles.inputLabel}>Team Name</label>
                            <input type="text" className={styles.input} value={tempTeamName} onChange={e => setTempTeamName(e.target.value)} placeholder="Eagle Squad..." />
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.inputLabel}>Select Members ({tempSelectedMemberIds.size} selected)</label>
                            <input type="text" className={styles.input} placeholder="Search members..." value={searchQuery} onChange={e => {
                                const q = e.target.value.toLowerCase()
                                setSearchQuery(q)
                                setFilteredMembers(availableMembers.filter(m => m.fullName.toLowerCase().includes(q) || m.studentAdmnNo.toLowerCase().includes(q)))
                            }} />

                            <div className={styles.membersList}>
                                {isLoadingMembers ? <p>Loading members...</p> :
                                    filteredMembers.map(member => (
                                        <label key={member.id} className={styles.checkboxLabel}>
                                            <input type="checkbox" checked={tempSelectedMemberIds.has(member.id)}
                                                onChange={() => {
                                                    const newSet = new Set(tempSelectedMemberIds)
                                                    newSet.has(member.id) ? newSet.delete(member.id) : newSet.add(member.id)
                                                    setTempSelectedMemberIds(newSet)
                                                }} />
                                            <div className={styles.memberInfo}>
                                                <span className={styles.memberName}>{member.fullName}</span>
                                                <span className={styles.memberDetails}>{member.studentAdmnNo}</span>
                                            </div>
                                        </label>
                                    ))}
                            </div>
                            <p className={styles.meta}>Requirement: {editingGroupProgram.minMembers}-{editingGroupProgram.maxMembers} (incl. you)</p>
                        </div>

                        <div className={styles.modalButtons}>
                            <button className={styles.cancelButton} onClick={() => setEditingGroupProgram(null)}>Cancel</button>
                            <button className={styles.confirmButton} onClick={saveGroupConfig}>Done</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Registration Confirmation Modal */}
            {showConfirmModal && user && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h2 className={cinzel.className}>Confirm Registration</h2>

                        <div className={styles.studentInfo}>
                            <p className={styles.studentDetail}>Name: <strong>{user.fullName}</strong></p>
                            <p className={styles.studentDetail}>House: <strong>{user.house?.name}</strong></p>
                            <p className={styles.studentDetail}>Items: <strong>{selectedIds.size}</strong></p>
                        </div>

                        <p>You are about to register for the following programs:</p>

                        <div className={styles.regSummary}>
                            {Array.from(selectedIds).map(id => {
                                const p = programs.find(prog => prog.id === id)
                                if (!p) return null
                                const config = groupConfigs[id]
                                return (
                                    <div key={id} className={styles.summaryItem}>
                                        <span className={styles.summaryName}>{p.name}</span>
                                        {p.type === 'GROUP' && config && (
                                            <span className={styles.summaryTeam}>Team: {config.groupName}</span>
                                        )}
                                        {p.type === 'SOLO' && (
                                            <span style={{ opacity: 0.6, fontSize: '0.8rem' }}>Solo</span>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        <p style={{ fontSize: '0.85rem', color: 'var(--primary-red)', fontWeight: 500 }}>
                            Note: Registration limits are strictly enforced. Please ensure your selection is correct.
                        </p>

                        <div className={styles.modalButtons}>
                            <button className={styles.cancelButton} onClick={() => setShowConfirmModal(false)}>Wait, let me check</button>
                            <button className={styles.confirmButton} onClick={confirmRegistration}>Confirm & Register</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
