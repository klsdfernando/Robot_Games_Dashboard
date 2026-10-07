import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  // Create sample template workbook
  const data = [
    ['Team Name', 'Team Logo Drive Link'],
    ['Apex Predator', 'https://drive.google.com/file/d/1exampleFileId1234567890/view?usp=sharing'],
    ['Quantum Overkill', 'https://drive.google.com/file/d/1exampleFileId0987654321/view?usp=sharing'],
    ['Inferno Squad', 'https://drive.google.com/open?id=1exampleFileId9988776655'],
    ['Cyber Titan', 'https://example.com/images/cyber-titan-logo.png']
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Set column widths for friendly viewing in Excel
  worksheet['!cols'] = [
    { wch: 25 }, // Team Name
    { wch: 70 }  // Team Logo Drive Link
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Teams');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="teams_template.xlsx"'
    }
  });
}
