import fs from 'fs';
import path from 'path';

/**
 * Extracts a Google Drive File ID from various link formats:
 * - https://drive.google.com/file/d/1a2B3c4D5e.../view?usp=sharing
 * - https://drive.google.com/open?id=1a2B3c4D5e...
 * - https://drive.google.com/uc?id=1a2B3c4D5e...
 * - https://drive.google.com/uc?export=download&id=1a2B3c4D5e...
 */
export function extractDriveFileId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // Pattern 1: /file/d/<ID>
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) return fileDMatch[1];

  // Pattern 2: id=<ID>
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) return idParamMatch[1];

  // Pattern 3: open?id=<ID>
  const openMatch = trimmed.match(/open\?id=([a-zA-Z0-9_-]+)/);
  if (openMatch && openMatch[1]) return openMatch[1];

  // If the user pasted a raw alphanumeric file ID of 25+ chars
  if (/^[a-zA-Z0-9_-]{25,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Resolves a Google Drive link or standard image URL into a direct, embeddable web URL
 * that can be stored in the database and loaded directly by browsers without local disk downloading.
 */
export function resolveDriveLogoUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  const fileId = extractDriveFileId(trimmed);
  if (fileId) {
    // High-res public Google image thumbnail/preview URL
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  }
  return trimmed;
}

/**
 * Returns candidate direct download URLs for a given URL (Google Drive or direct image).
 */
export function getDownloadCandidates(rawUrl: string): string[] {
  const fileId = extractDriveFileId(rawUrl);
  if (fileId) {
    return [
      // Candidate 1: Google's official high-res image thumbnail endpoint (most reliable for public drive images)
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
      // Candidate 2: Direct export download
      `https://drive.google.com/uc?export=download&id=${fileId}`,
      // Candidate 3: Direct export view
      `https://drive.google.com/uc?export=view&id=${fileId}`
    ];
  }

  // Not a drive link - test if it is a standard URL
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    return [rawUrl];
  }

  return [];
}

/**
 * Sanitizes a team name for a clean, filesystem-safe filename.
 */
function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'team';
}

/**
 * Detects image extension based on Content-Type header or buffer magic bytes.
 */
function getExtensionFromContentType(contentType: string | null, buffer: Buffer): string {
  const ct = (contentType || '').toLowerCase();
  if (ct.includes('image/png')) return 'png';
  if (ct.includes('image/jpeg') || ct.includes('image/jpg')) return 'jpg';
  if (ct.includes('image/webp')) return 'webp';
  if (ct.includes('image/svg+xml')) return 'svg';
  if (ct.includes('image/gif')) return 'gif';

  // Check magic bytes in buffer
  if (buffer.length >= 8) {
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'png';
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
    if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
    if (buffer.toString('utf-8', 0, 5) === '<?xml' || buffer.toString('utf-8', 0, 4) === '<svg') return 'svg';
  }

  return 'png';
}

/**
 * Downloads a logo from a Google Drive link or direct image URL,
 * saves it into public/uploads/team-logos, and returns the local public URL.
 */
export async function downloadAndSaveLogo(
  rawUrl: string,
  teamName: string
): Promise<{ success: boolean; localUrl?: string; error?: string }> {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { success: false, error: 'Empty URL provided' };
  }

  const candidates = getDownloadCandidates(rawUrl);
  if (candidates.length === 0) {
    return { success: false, error: 'Invalid Google Drive link or image URL' };
  }

  // Ensure storage directory exists
  const targetDir = path.join(process.cwd(), 'public', 'uploads', 'team-logos');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  let lastError = 'Failed to download logo';

  for (const candidateUrl of candidates) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

      const res = await fetch(candidateUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        },
        redirect: 'follow'
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        lastError = `HTTP ${res.status}: ${res.statusText}`;
        continue;
      }

      const contentType = res.headers.get('content-type') || '';
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Verify that this is not an HTML error or login page (must be > 200 bytes and not pure HTML)
      if (buffer.length < 150) {
        lastError = 'Downloaded content is too small to be a valid image';
        continue;
      }

      const firstChars = buffer.toString('utf-8', 0, Math.min(100, buffer.length)).toLowerCase();
      if (firstChars.includes('<!doctype html') || firstChars.includes('<html')) {
        lastError = 'Drive link returned an HTML page (check if file permissions are set to "Anyone with the link can view")';
        continue;
      }

      // Determine extension
      const ext = getExtensionFromContentType(contentType, buffer);
      const safeName = sanitizeFilename(teamName);
      const uniqueSuffix = Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
      const fileName = `${safeName}-${uniqueSuffix}.${ext}`;
      const filePath = path.join(targetDir, fileName);

      fs.writeFileSync(filePath, buffer);

      const localUrl = `/uploads/team-logos/${fileName}`;
      return { success: true, localUrl };
    } catch (err: any) {
      lastError = err.message || 'Network error during download';
    }
  }

  return { success: false, error: lastError };
}
