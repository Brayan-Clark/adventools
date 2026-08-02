-- ============================================================
-- 1) AUTO-VALIDATION : permettre à un utilisateur connecté de créer
--    son profil au premier login (rôle NULL = aucun accès jusqu'à activation)
-- ============================================================
CREATE POLICY "Utilisateurs peuvent créer leur profil" ON users
  FOR INSERT WITH CHECK (auth.uid() = id AND role_id IS NULL);

-- ============================================================
-- 2) Donner le rôle ADMIN à ton compte personnel.
--    Remplace <TON_EMAIL> par ton adresse (ex: clarco.dev@mada-digital.net)
-- ============================================================
INSERT INTO public.users (id, email, display_name, role_id, is_active)
SELECT id, email, 'Admin', (SELECT id FROM public.roles WHERE name = 'admin'), true
FROM auth.users
WHERE email = 'clarco.dev@mada-digital.net'
ON CONFLICT (id) DO UPDATE
  SET role_id = (SELECT id FROM public.roles WHERE name = 'admin'),
      is_active = true;

-- ============================================================
-- 3) Compte admin par défaut (créé par le script de setup) :
--    Email : admin@andeaha-hizaha.org
--    Mot de passe : Andeaha2026!
--    (Si tu veux le réinitialiser, dé-commente la ligne ci-dessous)
-- ============================================================
-- UPDATE auth.users SET encrypted_password = crypt('NouveauMotDePasse!', gen_salt('bf')) WHERE email = 'admin@andeaha-hizaha.org';
