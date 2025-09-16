import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/platforms - list available trading platforms (id, name, code)
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('trading_platforms')
    .select('id,name,code')
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
