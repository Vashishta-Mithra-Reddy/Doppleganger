import { NextResponse,NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function POST(request: NextRequest) {
  // Expecting { user_id, interests } in the request body.
  const { user_id, interests } = await request.json();

  const { data: matchProfiles, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('status', 'active')
    .neq('user_id', user_id)
    .contains('interests', interests)
    .limit(1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (matchProfiles && matchProfiles.length > 0) {
    const match = matchProfiles[0];
    await supabase
      .from('profiles')
      .update({ status: 'busy' })
      .eq('user_id', user_id);
    await supabase
      .from('profiles')
      .update({ status: 'busy' })
      .eq('user_id', match.user_id);

    return NextResponse.json({ match });
  }
  return NextResponse.json({ message: 'No match found' });
}
