'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { getMasterModels, getMasterTableData, createMasterRecord, updateMasterRecord, deleteMasterRecord, getExportData } from '@/actions/master'
import styles from '@/app/dashboard/dashboard.module.css'
import LoadingSpinner from './LoadingSpinner'
import { useModals } from '@/context/ModalContext'
import { Cinzel } from 'next/font/google'

const cinzel = Cinzel({ subsets: ['latin'] })

interface EnumValue {
    name: string
    dbName: string | null
}

interface ModelEnum {
    name: string
    values: EnumValue[]
}

interface ModelField {
    name: string
    type: string
    kind: string
    isRequired: boolean
    isId: boolean
    isReadOnly?: boolean
}

interface ModelSchema {
    name: string
    fields: ModelField[]
}

interface MasterData {
    models: ModelSchema[]
    enums: ModelEnum[]
}

export default function DatabasePanel() {
    const modals = useModals()
    const [masterData, setMasterData] = useState<MasterData | null>(null)
    const [selectedModelName, setSelectedModelName] = useState<string>('')
    const [data, setData] = useState<any[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(false)
    const [loadingModels, setLoadingModels] = useState(true)
    const [editingRecord, setEditingRecord] = useState<any | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [formData, setFormData] = useState<any>({})
    const [searchQuery, setSearchQuery] = useState('')

    const limit = 20

    useEffect(() => {
        loadModels()
    }, [])

    useEffect(() => {
        if (selectedModelName) {
            loadTableData(selectedModelName, page)
        }
    }, [selectedModelName, page])

    const loadModels = async () => {
        setLoadingModels(true)
        const res = await getMasterModels()
        if (res.success && res.data) {
            setMasterData(res.data as any)
            if (res.data.models.length > 0) {
                setSelectedModelName(res.data.models[0].name)
            }
        } else {
            modals.showToast(res.error || 'Failed to load models', 'error')
        }
        setLoadingModels(false)
    }

    const loadTableData = async (modelName: string, p: number) => {
        setLoading(true)
        const res = await getMasterTableData(modelName, { page: p, limit })
        if (res.success && res.data) {
            setData(res.data.items)
            setTotal(res.data.total)
        } else {
            modals.showToast(res.error || 'Failed to load data', 'error')
        }
        setLoading(false)
    }

    const handleCreate = () => {
        setEditingRecord(null)
        const initialForm: any = {}
        const currentModel = masterData?.models.find(m => m.name === selectedModelName)
        currentModel?.fields.forEach(f => {
            if (f.type === 'Boolean') initialForm[f.name] = false
        })
        setFormData(initialForm)
        setIsModalOpen(true)
    }

    const handleEdit = (record: any) => {
        setEditingRecord(record)
        const clonedRecord = { ...record }
        const currentModel = masterData?.models.find(m => m.name === selectedModelName)
        currentModel?.fields.forEach(f => {
            if (f.type === 'DateTime' && record[f.name]) {
                clonedRecord[f.name] = new Date(record[f.name]).toISOString().slice(0, 16)
            }
            if (f.type === 'Json' && record[f.name]) {
                clonedRecord[f.name] = JSON.stringify(record[f.name], null, 2)
            }
        })
        setFormData(clonedRecord)
        setIsModalOpen(true)
    }

    const handleDelete = async (id: string) => {
        modals.confirm({
            title: 'Delete Record',
            message: 'Are you sure you want to delete this record? This action cannot be undone.',
            confirmText: 'Delete',
            onConfirm: async () => {
                const res = await deleteMasterRecord(selectedModelName, id)
                if (res.success) {
                    modals.showToast('Record deleted successfully', 'success')
                    loadTableData(selectedModelName, page)
                } else {
                    modals.showToast(res.error || 'Failed to delete record', 'error')
                }
            }
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const currentModel = masterData?.models.find(m => m.name === selectedModelName)
        const cleanedData: any = {}

        currentModel?.fields.forEach(f => {
            // Skip relation fields (kind: 'object') as they require special handling
            // and skip read-only or ID fields during the data block preparation
            if (f.kind === 'object' || f.isReadOnly || f.isId) return

            let value = formData[f.name]

            if (value === '' || value === undefined) {
                cleanedData[f.name] = null
            } else if (f.type === 'Int' || f.type === 'Float') {
                cleanedData[f.name] = Number(value)
            } else if (f.type === 'Boolean') {
                cleanedData[f.name] = String(value) === 'true'
            } else if (f.type === 'DateTime') {
                cleanedData[f.name] = value ? new Date(value) : null
            } else if (f.type === 'Json') {
                try {
                    cleanedData[f.name] = typeof value === 'string' ? JSON.parse(value) : value
                } catch (e) {
                    cleanedData[f.name] = value
                }
            } else {
                cleanedData[f.name] = value
            }
        })

        let res
        if (editingRecord) {
            res = await updateMasterRecord(selectedModelName, editingRecord.id, cleanedData)
        } else {
            res = await createMasterRecord(selectedModelName, cleanedData)
        }

        if (res.success) {
            modals.showToast(`Record ${editingRecord ? 'updated' : 'created'} successfully`, 'success')
            setIsModalOpen(false)
            loadTableData(selectedModelName, page)
        } else {
            modals.showToast(res.error || 'Operation failed', 'error')
        }
        setLoading(false)
    }

    const exportToCSV = async () => {
        setLoading(true)
        const res = await getExportData(selectedModelName)
        if (res.success && res.data) {
            const items = res.data
            if (items.length === 0) {
                modals.showToast('No data to export', 'info')
                setLoading(false)
                return
            }

            const headers = Object.keys(items[0]).join(',')
            const rows = items.map((item: any) =>
                Object.values(item).map(val => {
                    if (val === null || val === undefined) return ''
                    if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`
                    return `"${String(val).replace(/"/g, '""')}"`
                }).join(',')
            )

            const csvContent = [headers, ...rows].join('\n')
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.setAttribute('href', url)
            link.setAttribute('download', `${selectedModelName}_export_${new Date().toISOString().split('T')[0]}.csv`)
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            modals.showToast('Export successful', 'success')
        } else {
            modals.showToast(res.error || 'Export failed', 'error')
        }
        setLoading(false)
    }

    const currentModel = useMemo(() =>
        masterData?.models.find(m => m.name === selectedModelName),
        [masterData, selectedModelName])

    const visibleFields = useMemo(() =>
        currentModel?.fields.filter(f => f.type !== 'Relation' && f.kind !== 'object') || [],
        [currentModel])

    const filteredData = useMemo(() => {
        if (!searchQuery) return data
        return data.filter(item =>
            Object.values(item).some(val =>
                String(val).toLowerCase().includes(searchQuery.toLowerCase())
            )
        )
    }, [data, searchQuery])

    const renderInputField = (f: ModelField) => {
        const isPassword = f.name.toLowerCase().includes('password')
        const isLongText = ['description', 'message', 'bio', 'content', 'value', 'data'].includes(f.name.toLowerCase()) || f.type === 'String' && f.name === 'value'

        if (f.isId || f.isReadOnly) {
            return (
                <input
                    type="text"
                    value={formData[f.name] || '(System Controlled)'}
                    className={styles.searchInput}
                    disabled
                    style={{ opacity: 0.6, width: '100%' }}
                />
            )
        }

        if (f.kind === 'enum') {
            const enumType = masterData?.enums.find(e => e.name === f.type)
            return (
                <select
                    value={formData[f.name] || ''}
                    onChange={e => setFormData({ ...formData, [f.name]: e.target.value })}
                    className={styles.selectInput}
                    required={f.isRequired}
                    style={{ width: '100%' }}
                >
                    <option value="">Select...</option>
                    {enumType?.values.map(v => (
                        <option key={v.name} value={v.name}>{v.name}</option>
                    ))}
                </select>
            )
        }

        if (f.type === 'Boolean') {
            return (
                <select
                    value={String(formData[f.name] ?? '')}
                    onChange={e => setFormData({ ...formData, [f.name]: e.target.value === 'true' })}
                    className={styles.selectInput}
                    required={f.isRequired}
                    style={{ width: '100%' }}
                >
                    <option value="false">False / No</option>
                    <option value="true">True / Yes</option>
                </select>
            )
        }

        if (f.type === 'DateTime') {
            return (
                <input
                    type="datetime-local"
                    value={formData[f.name] || ''}
                    onChange={e => setFormData({ ...formData, [f.name]: e.target.value })}
                    className={styles.searchInput}
                    required={f.isRequired}
                    style={{ width: '100%' }}
                />
            )
        }

        if (f.type === 'Json') {
            return (
                <textarea
                    value={formData[f.name] || ''}
                    onChange={e => setFormData({ ...formData, [f.name]: e.target.value })}
                    className={styles.searchInput}
                    style={{ minHeight: '120px', fontFamily: 'monospace', width: '100%' }}
                    required={f.isRequired}
                    placeholder='{"key": "value"}'
                />
            )
        }

        if (isLongText) {
            return (
                <textarea
                    value={formData[f.name] || ''}
                    onChange={e => setFormData({ ...formData, [f.name]: e.target.value })}
                    className={styles.searchInput}
                    style={{ minHeight: '100px', width: '100%' }}
                    required={f.isRequired}
                />
            )
        }

        return (
            <input
                type={isPassword ? 'password' : (f.type === 'Int' || f.type === 'Float' ? 'number' : 'text')}
                step={f.type === 'Float' ? 'any' : undefined}
                value={formData[f.name] ?? ''}
                onChange={e => setFormData({ ...formData, [f.name]: e.target.value })}
                className={styles.searchInput}
                required={f.isRequired}
                placeholder={`Enter ${f.name}`}
                style={{ width: '100%' }}
            />
        )
    }

    if (loadingModels) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10rem 0', opacity: 0.8 }}>
                <LoadingSpinner size="40px" />
            </div>
        )
    }

    return (
        <div style={{ width: '100%', animation: 'fadeIn 0.5s ease-out' }}>
            {/* Header Area */}
            <div style={{
                background: 'rgba(255,255,255,0.03)',
                padding: '2rem',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.05)',
                marginBottom: '2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                    <div>
                        <h2 className={cinzel.className} style={{ margin: 0, fontSize: '1.8rem', color: 'var(--primary-gold)' }}>System Master</h2>
                        <p style={{ margin: '4px 0 0 0', opacity: 0.5, fontSize: '0.9rem' }}>Direct database management and exports</p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.8rem' }}>
                        <button onClick={exportToCSV} className={styles.exportButton} style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)', height: '42px' }}>
                            Export CSV
                        </button>
                        <button onClick={handleCreate} className={styles.addButton} style={{ height: '42px', padding: '0 1.5rem' }}>
                            + Add Record
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1', minWidth: '200px' }}>
                        <select
                            value={selectedModelName}
                            onChange={(e) => { setSelectedModelName(e.target.value); setPage(1); setSearchQuery(''); }}
                            className={styles.selectInput}
                            style={{ width: '100%' }}
                        >
                            {masterData?.models.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                        </select>
                    </div>
                    <div style={{ flex: '2', minWidth: '300px' }}>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter records..."
                            className={styles.searchInput}
                            style={{ width: '100%' }}
                        />
                    </div>
                </div>
            </div>

            {/* Table Area */}
            <div className={styles.tableCard} style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto', width: '100%' }}>
                    <table className={styles.userTable} style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                {visibleFields.slice(0, 8).map(f => (
                                    <th key={f.name} style={{ textAlign: 'left', padding: '1.2rem 1rem' }}>
                                        <div style={{ fontSize: '0.9rem' }}>{f.name}</div>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.4, fontWeight: 'normal' }}>{f.type}</div>
                                    </th>
                                ))}
                                <th style={{ textAlign: 'right', padding: '1.2rem 1rem' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={visibleFields.length + 1} style={{ textAlign: 'center', padding: '5rem' }}><LoadingSpinner /></td></tr>
                            ) : filteredData.length === 0 ? (
                                <tr><td colSpan={visibleFields.length + 1} style={{ textAlign: 'center', padding: '5rem', opacity: 0.5 }}>No records found.</td></tr>
                            ) : (
                                filteredData.map((record, i) => (
                                    <tr key={record.id || i} className={styles.tableRowHover}>
                                        {visibleFields.slice(0, 8).map(f => (
                                            <td key={f.name} style={{ padding: '1rem' }}>
                                                <div style={{
                                                    maxWidth: '200px',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    fontSize: '0.9rem',
                                                    fontFamily: (f.type === 'Int' || f.isId) ? 'monospace' : 'inherit'
                                                }}>
                                                    {record[f.name] === null ? <span style={{ opacity: 0.3 }}>null</span> :
                                                        typeof record[f.name] === 'boolean' ? (record[f.name] ? 'YES' : 'NO') :
                                                            f.type === 'DateTime' ? new Date(record[f.name]).toLocaleDateString() :
                                                                typeof record[f.name] === 'object' ? '{...}' : String(record[f.name])}
                                                </div>
                                            </td>
                                        ))}
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                <button onClick={() => handleEdit(record)} className={styles.editBtn} style={{ padding: '4px 12px' }}>Edit</button>
                                                <button onClick={() => handleDelete(record.id)} className={styles.deleteBtn} style={{ padding: '4px 12px' }}>Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div style={{ padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ fontSize: '0.9rem', opacity: 0.6 }}>Total: {total} records</div>
                    {total > limit && (
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <button disabled={page === 1 || loading} onClick={() => setPage(p => p - 1)} className={styles.navItem} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>Previous</button>
                            <span style={{ fontSize: '1rem', fontWeight: 600 }}>{page} / {Math.ceil(total / limit)}</span>
                            <button disabled={page >= Math.ceil(total / limit) || loading} onClick={() => setPage(p => p + 1)} className={styles.navItem} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>Next</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className={styles.modalOverlay} style={{ padding: '1rem' }}>
                    <div className={styles.adminModal} style={{ width: '100%', maxWidth: '900px', padding: '0', borderRadius: '24px', overflow: 'hidden', minHeight: 'auto' }}>
                        <div style={{ background: '#1a1a1a', padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
                            <h3 className={cinzel.className} style={{ margin: 0, fontSize: '1.3rem', color: 'var(--primary-gold)' }}>
                                {editingRecord ? 'Override' : 'New'} {selectedModelName} Entry
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '2rem', lineHeight: 1 }}>&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '2rem', maxHeight: '65vh', overflowY: 'auto' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '2rem' }}>
                                    {visibleFields.map(f => (
                                        <div key={f.name} className={styles.formGroup} style={{ margin: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <label className={styles.formLabel} style={{ margin: 0 }}>{f.name} {f.isRequired && !f.isId && '*'}</label>
                                                <span style={{ fontSize: '0.7rem', opacity: 0.3, textTransform: 'uppercase' }}>{f.type}</span>
                                            </div>
                                            {renderInputField(f)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div style={{ padding: '1.5rem 2rem', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} className={styles.cancelButton} style={{ padding: '0.8rem 1.5rem' }}>Abort</button>
                                <button type="submit" className={styles.addButton} disabled={loading} style={{ padding: '0.8rem 2.5rem' }}>
                                    {loading ? 'Processing...' : 'Commit Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
