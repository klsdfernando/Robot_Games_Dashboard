import { NextRequest, NextResponse } from 'next/server';
import { uploadBufferToFreeImage, uploadUrlToFreeImage } from '@/lib/freeimage';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // 1. Handle JSON request (e.g. { url: "https://drive.google.com/..." })
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const rawUrl = body.url || body.driveLink || body.imageUrl;

      if (!rawUrl || typeof rawUrl !== 'string') {
        return NextResponse.json(
          { error: 'A valid image URL or Google Drive link is required in the body' },
          { status: 400 }
        );
      }

      const result = await uploadUrlToFreeImage(rawUrl, body.filename);
      if (!result.success || !result.url) {
        return NextResponse.json(
          { error: result.error || 'Failed to upload image to Freeimage.host' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        url: result.url,
        displayUrl: result.displayUrl || result.url,
        thumbUrl: result.thumbUrl,
        viewerUrl: result.viewerUrl,
        filename: result.filename,
        size: result.size
      });
    }

    // 2. Handle FormData (file upload or form URL)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const urlParam = formData.get('url') as string | null;

      // File upload
      if (file && typeof file === 'object' && typeof file.arrayBuffer === 'function') {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (buffer.length === 0) {
          return NextResponse.json({ error: 'Uploaded file is empty' }, { status: 400 });
        }

        const result = await uploadBufferToFreeImage(buffer, file.name, file.type || 'image/png');
        if (!result.success || !result.url) {
          return NextResponse.json(
            { error: result.error || 'Failed to host image on Freeimage.host' },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          url: result.url,
          displayUrl: result.displayUrl || result.url,
          thumbUrl: result.thumbUrl,
          viewerUrl: result.viewerUrl,
          filename: result.filename,
          size: result.size
        });
      }

      // URL provided in form data
      if (urlParam && typeof urlParam === 'string' && urlParam.trim()) {
        const result = await uploadUrlToFreeImage(urlParam.trim());
        if (!result.success || !result.url) {
          return NextResponse.json(
            { error: result.error || 'Failed to host image from URL' },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          url: result.url,
          displayUrl: result.displayUrl || result.url,
          thumbUrl: result.thumbUrl,
          viewerUrl: result.viewerUrl,
          filename: result.filename,
          size: result.size
        });
      }

      return NextResponse.json(
        { error: 'No file or valid URL provided in form data' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Unsupported Content-Type. Please use multipart/form-data or application/json' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('[API /api/upload error]:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error while processing image upload' },
      { status: 500 }
    );
  }
}
