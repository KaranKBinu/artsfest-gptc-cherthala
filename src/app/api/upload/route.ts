import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import path from 'path'

// Using Vercel Blob for storage (Free tier: 250MB)
export async function POST(request: NextRequest) {
    try {
        const data = await request.formData()
        const file: File | null = data.get('file') as unknown as File

        if (!file) {
            return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 })
        }

        // Check if token exists
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
            return NextResponse.json({
                success: false,
                error: 'BLOB_READ_WRITE_TOKEN is not configured in .env'
            }, { status: 500 })
        }

        // 4MB limit for now, though Blob supports up to 500MB
        if (file.size > 4 * 1024 * 1024) {
            return NextResponse.json({ success: false, error: 'File too large. Max 4MB allowed.' }, { status: 400 })
        }

        // Create unique filename in the requested folder
        const filename = `artsfest2026/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`

        // Upload to Vercel Blob
        const blob = await put(filename, file, {
            access: 'public',
        })

        return NextResponse.json({ success: true, url: blob.url })
    } catch (error) {
        console.error('Upload failed:', error)
        return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 })
    }
}
