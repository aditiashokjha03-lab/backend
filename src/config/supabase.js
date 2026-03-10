const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Missing Supabase environment variables. Database functionality will not work.');
}

const supabase = createClient(supabaseUrl || 'http://localhost', supabaseServiceKey || 'dummy');

module.exports = supabase;
