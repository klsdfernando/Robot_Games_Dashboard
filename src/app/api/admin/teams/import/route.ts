import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getTeams, createTeam, updateTeam, getCategoryById, getCategoryByName } from '@/lib/repository';
import { resolveDriveLogoUrl } from '@/lib/logo-downloader';
import { uploadUrlToFreeImage } from '@/lib/freeimage';
import { syncTeamToSupabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized. Admin login required.' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const categoryId = (formData.get('categoryId') as string) || '';

    if (!file) {
      return NextResponse.json({ error: 'Please upload an Excel (.xlsx, .xls) or CSV file.' }, { status: 400 });
    }

    if (!categoryId) {
      return NextResponse.json({ error: 'Category ID is required for team import.' }, { status: 400 });
    }

    let targetCatId = categoryId;
    const cat = getCategoryById(targetCatId);
    if (!cat) {
      const normalized = targetCatId.replace('cat-', '').replace('cat_', '').toUpperCase() as any;
      const catByName = getCategoryByName(normalized);
      if (catByName) {
        targetCatId = catByName.id;
      } else {
        return NextResponse.json({ error: `Category '${categoryId}' not found.` }, { status: 400 });
      }
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse Excel workbook
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return NextResponse.json({ error: 'The uploaded Excel file has no worksheets.' }, { status: 400 });
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json({ error: 'The uploaded spreadsheet is empty.' }, { status: 400 });
    }

    // Identify columns
    let nameColIdx = 0;
    let logoColIdx = 1;
    let startIndex = 0;

    // Check first row for column headers
    const firstRow = rawRows[0] || [];
    const header0 = String(firstRow[0] || '').trim().toLowerCase();
    const header1 = String(firstRow[1] || '').trim().toLowerCase();

    const isHeaderRow =
      header0.includes('team') ||
      header0.includes('name') ||
      header1.includes('logo') ||
      header1.includes('link') ||
      header1.includes('drive');

    if (isHeaderRow) {
      startIndex = 1;
      // Look for which column is name and which is logo link
      firstRow.forEach((cell: any, idx: number) => {
        const val = String(cell || '').trim().toLowerCase();
        if (val.includes('logo') || val.includes('link') || val.includes('drive') || val.includes('url')) {
          logoColIdx = idx;
        } else if (val.includes('team') || val.includes('name')) {
          nameColIdx = idx;
        }
      });
    }

    const existingTeams = getTeams(targetCatId);
    const importedTeams = [];
    const warnings: string[] = [];
    let logosDownloaded = 0;

    // Process rows
    for (let i = startIndex; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.length === 0) continue;

      const teamName = String(row[nameColIdx] || '').trim();
      const driveLink = String(row[logoColIdx] || '').trim();

      if (!teamName) {
        continue; // Skip empty rows
      }

      let resolvedLogoUrl: string | undefined = undefined;

      // Resolve and host logo to Freeimage.host CDN (iili.io)
      if (driveLink && (driveLink.startsWith('http://') || driveLink.startsWith('https://') || driveLink.length > 20)) {
        try {
          const hosted = await uploadUrlToFreeImage(driveLink, teamName);
          if (hosted.success && hosted.url) {
            resolvedLogoUrl = hosted.url;
            logosDownloaded++;
          } else {
            resolvedLogoUrl = resolveDriveLogoUrl(driveLink) || driveLink;
            if (resolvedLogoUrl) logosDownloaded++;
          }
        } catch {
          resolvedLogoUrl = resolveDriveLogoUrl(driveLink) || driveLink;
          if (resolvedLogoUrl) logosDownloaded++;
        }
      }

      // Check if team already exists in this category
      const existing = existingTeams.find(t => t.name.toLowerCase() === teamName.toLowerCase());

      if (existing) {
        // Update existing team
        const updated = updateTeam(existing.id, {
          logoUrl: resolvedLogoUrl || existing.logoUrl
        });
        if (updated) {
          importedTeams.push(updated);
          syncTeamToSupabase(updated).catch(() => {});
        }
      } else {
        // Create new team
        const newTeam = createTeam({
          categoryId: targetCatId,
          name: teamName,
          logoUrl: resolvedLogoUrl
        });
        importedTeams.push(newTeam);
        syncTeamToSupabase(newTeam).catch(() => {});
      }
    }

    if (importedTeams.length === 0) {
      return NextResponse.json(
        { error: 'No valid team entries found in the spreadsheet. Please ensure Column A has Team Name.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      importedCount: importedTeams.length,
      logosDownloadedCount: logosDownloaded,
      warnings,
      teams: importedTeams
    });
  } catch (err: any) {
    console.error('Error importing teams from Excel:', err);
    return NextResponse.json({ error: err.message || 'Failed to process Excel file' }, { status: 500 });
  }
}
