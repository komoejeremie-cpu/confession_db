import 'dotenv/config';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Les variables SUPABASE_URL et SUPABASE_KEY sont obligatoires.'
  );
}

const supabase = createClient(
  supabaseUrl,
  supabaseKey
);

export default supabase;