import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eaxeqenkavftvktewvyk.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_4OIIxAffuM6phgLFkAIJXQ_EcHn4EMu';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);