import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFucWRmdGlxb3dmbHRjc2ttYWRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODQ3NTU0OCwiZXhwIjoyMDU0MDUxNTQ4fQ.p-kik6C_1N8G_sb61GOhAmPz_uaacUOcTrZOHhnXtJM";

if (!supabaseServiceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is required but missing.");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
