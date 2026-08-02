/**
 * Edge Function Supabase : création d'utilisateur par un admin.
 *
 * Seul un utilisateur authentifié avec le rôle 'admin' peut créer des comptes.
 * La vérification se fait en base via has_role() (politique RLS sur users).
 * Cette fonction utilise la clé service_role pour appeler auth.admin.createUser.
 *
 * Déploiement : supabase functions deploy admin-create-user
 *
 * Body attendu :
 * {
 *   email: string,
 *   password: string,
 *   role: 'admin' | 'editor' | 'viewer',
 *   display_name?: string
 * }
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const VALID_ROLES = ['admin', 'editor', 'viewer'];

Deno.serve(async (req: Request) => {
  // CORS pour GitHub Pages
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    // Récupère l'utilisateur appelant via le header Authorization (JWT anon/authed)
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'non authentifié' }), { status: 401, headers });
    }

    // Vérifie que l'appelant est admin (table users → role)
    const { data: profile } = await supabaseClient
      .from('users')
      .select('role:roles(name)')
      .eq('id', user.id)
      .single();
    if (profile?.role?.name !== 'admin') {
      return new Response(JSON.stringify({ error: 'non autorisé' }), { status: 403, headers });
    }

    const body = await req.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const role = String(body.role ?? 'viewer');
    const displayName = String(body.display_name ?? '').trim();

    if (!email || password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'email requis et mot de passe d\'au moins 8 caractères' }),
        { status: 400, headers }
      );
    }
    if (!VALID_ROLES.includes(role)) {
      return new Response(JSON.stringify({ error: 'rôle invalide' }), { status: 400, headers });
    }

    // Crée l'utilisateur dans auth.users
    const { data: created, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName || email.split('@')[0] },
    });
    if (error) throw error;

    // Insère le profil dans public.users avec le rôle demandé
    const { error: insertError } = await supabaseClient
      .from('users')
      .insert({
        id: created.user!.id,
        email,
        display_name: displayName || null,
        role_id: (await getRoleId(supabaseClient, role))!,
        is_active: true,
      });
    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ ok: true, id: created.user!.id, email }),
      { status: 201, headers }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers }
    );
  }
});

async function getRoleId(client: any, roleName: string): Promise<string | null> {
  const { data } = await client.from('roles').select('id').eq('name', roleName).single();
  return data?.id ?? null;
}
