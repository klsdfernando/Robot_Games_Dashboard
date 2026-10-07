import { NextRequest, NextResponse } from 'next/server';
import {
  getCategories,
  getCategoryByName,
  getTournamentOverview,
  getMatches,
  getTeams,
  getStages
} from '@/lib/repository';
import { TournamentCategory } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryParam = (searchParams.get('category')?.toUpperCase() || 'HEAVYWEIGHT') as TournamentCategory;

    const categories = getCategories();
    let selectedCat = categories.find(c => c.name === categoryParam) || categories[0];

    if (!selectedCat) {
      return NextResponse.json({ error: 'No categories found' }, { status: 404 });
    }

    const overview = getTournamentOverview(selectedCat.id);
    const matches = getMatches(selectedCat.id);
    const teams = getTeams(selectedCat.id);
    const stages = getStages(selectedCat.id);

    return NextResponse.json({
      categories,
      selectedCategory: selectedCat,
      overview,
      stages,
      matches,
      teams,
      lastUpdated: new Date().toISOString()
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
