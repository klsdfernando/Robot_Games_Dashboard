import { getDownloadCandidates } from './logo-downloader';

const FREEIMAGE_API_URL = 'https://freeimage.host/api/1/upload';
const DEFAULT_API_KEY = '6d207e02198a847aa98d0a2a901485a5';

export interface FreeImageUploadResult {
  success: boolean;
  url?: string;
  displayUrl?: string;
  thumbUrl?: string;
  viewerUrl?: string;
  filename?: string;
  size?: number;
  error?: string;
}

/**
 * Gets the configured Freeimage.host API key from environment or fallback default.
 */
export function getFreeImageApiKey(): string {
  return process.env.FREEIMAGE_API_KEY?.trim() || DEFAULT_API_KEY;
}

/**
 * Uploads an image Buffer or Blob to Freeimage.host via API v1.
 */
export async function uploadBufferToFreeImage(
  buffer: Buffer | Uint8Array,
  filename: string = 'image.png',
  mimeType: string = 'image/png'
): Promise<FreeImageUploadResult> {
  const apiKey = getFreeImageApiKey();
  if (!apiKey) {
    return { success: false, error: 'Freeimage.host API key is not configured' };
  }

  try {
    const blob = new Blob([buffer as any], { type: mimeType });
    const formData = new FormData();
    formData.append('key', apiKey);
    formData.append('action', 'upload');
    formData.append('format', 'json');
    formData.append('source', blob, filename);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

    const res = await fetch(FREEIMAGE_API_URL, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await res.json().catch(() => null);

    if (!res.ok || !data) {
      const errMsg = data?.error?.message || `Upload failed with HTTP ${res.status}`;
      return { success: false, error: errMsg };
    }

    if (data.status_code !== 200 || !data.image) {
      const errMsg = data?.error?.message || data?.status_txt || 'Image hosting service rejected upload';
      return { success: false, error: errMsg };
    }

    const img = data.image;
    const directUrl = img.url || img.display_url || img.image?.url;

    return {
      success: true,
      url: directUrl,
      displayUrl: img.display_url || directUrl,
      thumbUrl: img.thumb?.url,
      viewerUrl: img.url_viewer,
      filename: img.filename || filename,
      size: img.size
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.name === 'AbortError' ? 'Upload timed out' : err.message || 'Network error during upload'
    };
  }
}

/**
 * Uploads an image from a remote URL (such as a Google Drive link, external web image, etc.)
 * to Freeimage.host to obtain a direct, permanent CDN link (iili.io).
 */
export async function uploadUrlToFreeImage(
  rawUrl: string,
  preferredFilename?: string
): Promise<FreeImageUploadResult> {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { success: false, error: 'Empty URL provided' };
  }

  const trimmed = rawUrl.trim();

  // If already hosted on Freeimage CDN (iili.io or freeimage.host direct), return immediately
  if (
    trimmed.startsWith('https://iili.io/') ||
    trimmed.startsWith('http://iili.io/') ||
    trimmed.startsWith('https://i.freeimage.host/') ||
    trimmed.startsWith('http://i.freeimage.host/')
  ) {
    return {
      success: true,
      url: trimmed,
      displayUrl: trimmed
    };
  }

  // Attempt direct download from candidate URLs (works for Google Drive share links and raw URLs)
  const candidates = getDownloadCandidates(trimmed);
  if (candidates.length === 0 && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return { success: false, error: 'Invalid URL or Google Drive link' };
  }

  const urlsToTry = candidates.length > 0 ? candidates : [trimmed];
  let lastError = 'Failed to fetch image from source';

  for (const candidateUrl of urlsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const fetchRes = await fetch(candidateUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        },
        redirect: 'follow'
      });

      clearTimeout(timeoutId);

      if (!fetchRes.ok) {
        lastError = `Source server returned HTTP ${fetchRes.status}`;
        continue;
      }

      const contentType = fetchRes.headers.get('content-type') || 'image/png';
      const arrayBuffer = await fetchRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length < 150) {
        lastError = 'Fetched file is too small to be an image';
        continue;
      }

      // Detect if it returned an HTML login or error page
      const snippet = buffer.toString('utf-8', 0, Math.min(100, buffer.length)).toLowerCase();
      if (snippet.includes('<!doctype html') || snippet.includes('<html')) {
        lastError = 'Drive link returned an HTML page instead of an image (ensure permissions are set to "Anyone with the link can view")';
        continue;
      }

      let ext = 'png';
      if (contentType.includes('webp')) ext = 'webp';
      else if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = 'jpg';
      else if (contentType.includes('svg')) ext = 'svg';
      else if (contentType.includes('gif')) ext = 'gif';

      const filename = preferredFilename ? `${preferredFilename}.${ext}` : `team-logo-${Date.now()}.${ext}`;

      // Upload the fetched buffer to Freeimage.host
      return await uploadBufferToFreeImage(buffer, filename, contentType);
    } catch (err: any) {
      lastError = err.message || 'Error downloading image from source';
    }
  }

  // Fallback: If downloading buffer locally failed, try asking Freeimage.host to fetch the URL directly
  try {
    const apiKey = getFreeImageApiKey();
    const formData = new FormData();
    formData.append('key', apiKey);
    formData.append('action', 'upload');
    formData.append('format', 'json');
    formData.append('source', trimmed);

    const res = await fetch(FREEIMAGE_API_URL, {
      method: 'POST',
      body: formData
    });

    const data = await res.json().catch(() => null);
    if (res.ok && data?.status_code === 200 && data.image) {
      const img = data.image;
      const directUrl = img.url || img.display_url || img.image?.url;
      return {
        success: true,
        url: directUrl,
        displayUrl: img.display_url || directUrl,
        thumbUrl: img.thumb?.url,
        viewerUrl: img.url_viewer
      };
    }
  } catch {
    // Keep lastError
  }

  return { success: false, error: lastError };
}
