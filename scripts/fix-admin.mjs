/**
 * Ajoute un profil admin pour un compte Supabase existant.
 * Usage: node scripts/fix-admin.mjs <email>
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const email = process.argv[2];
if (!email) { console.error('Usage: node scripts/fix-admin.mjs <email>'); process.exit(1); }

// Charger .env
const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8')
  .split('\n').filter(l => l.includes('='))
  .forEach(line => { const [k, ...v] = line.split('='); env[k.trim()] = v.join('=').trim(); });

const s = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const { data: authUsers, error: authErr } = await s.auth.admin.listUsers();
  if (authErr) throw authErr;
  const user = authUsers.users.find(u => u.email === email);
  if (!user) { console.log(`❌ Compte ${email} introuvable dans Supabase auth.`); return; }

  const { data: role, error: roleErr } = await s.from('roles').select('id').eq('name', 'admin').single();
  if (roleErr) throw roleErr;

  const { error } = await s.from('users').upsert({
    id: user.id,
    email: user.email,
    display_name: user.user_metadata?.full_name || 'Admin',
    role_id: role.id,
    is_active: true
  }, { onConflict: 'id' });

  if (error) throw error;
  console.log(`✅ Profil admin créé pour ${email}`);
  console.log(`   id: ${user.id}`);
  console.log(`   Confirmation email: ${user.email_confirmed_at ? 'OUI' : 'NON — active-le dans le dashboard'}`);
}

main().catch(e => console.error('❌', e.message));
