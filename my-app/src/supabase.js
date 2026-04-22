import { createClient } from '@supabase/supabase-js';

const url = process.env.REACT_APP_SUPABASE_URL;
const key = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Returns null if env vars are missing — all callers handle null gracefully
export default (url && key) ? createClient(url, key) : null;
