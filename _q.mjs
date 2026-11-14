import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: t } = await s.from('tenants').select('id').eq('slug','lima-laca').single();
const { data } = await s.from('promotions').select('*').eq('tenant_id', t.id);
console.log(JSON.stringify(data));
