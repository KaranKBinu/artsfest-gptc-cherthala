import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
    console.log('Upload API: Request received');

    const { searchParams } = new URL(request.url);
    const queryFilename = searchParams.get('filename');

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.error('Upload API: BLOB_READ_WRITE_TOKEN is missing');
        return NextResponse.json(
            { success: false, error: 'BLOB_READ_WRITE_TOKEN is not configured in .env' },
            { status: 500 }
        );
    }

    try {
        let file: File | Blob | ReadableStream | null = null;
        let filename = queryFilename;

        const contentType = request.headers.get('content-type') || '';
        console.log('Upload API: Content-Type:', contentType);

        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            const formFile = formData.get('file');
            if (formFile && formFile instanceof File) {
                file = formFile;
                // Use filename from file if not provided in query
                if (!filename) {
                    filename = formFile.name;
                }
                console.log('Upload API: File found in formData:', filename, 'Size:', formFile.size);
            } else {
                console.log('Upload API: No valid file in formData');
            }
        } else {
            // Raw body upload (stream)
            file = request.body;
            console.log('Upload API: Using request body as stream');
        }

        if (!file) {
            console.error('Upload API: No file uploaded');
            return NextResponse.json(
                { success: false, error: 'No file uploaded' },
                { status: 400 }
            );
        }

        // Default filename if still missing
        if (!filename) {
            filename = `upload-${Date.now()}`;
        }

        console.log('Upload API: Uploading to Vercel Blob:', filename);

        // Upload to Vercel Blob
        const blob = await put(filename, file, {
            access: 'public',
            addRandomSuffix: true, // Prevent overwrites
        });

        console.log('Upload API: Upload successful. URL:', blob.url);
        console.log('Upload API: Full blob response:', JSON.stringify(blob));

        // Return success: true for existing frontend compatibility
        return NextResponse.json({
            success: true,
            ...blob
        });

    } catch (error) {
        console.error('Error uploading to Vercel Blob:', error);
        return NextResponse.json(
            { success: false, error: 'Upload failed: ' + (error as Error).message },
            { status: 500 }
        );
    }
}
