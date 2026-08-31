-- ============================================================
-- AMORÇAGE DES ACCÈS ADMINISTRATEUR — Andeaha Hizaha
-- ============================================================
--
-- À exécuter dans Supabase → SQL Editor → New query → Run.
-- Le script est idempotent : le relancer ne casse rien.
--
-- ⚠️ AVANT DE LANCER : remplacez l'adresse ci-dessous (une seule occurrence,
--    étape 3) par celle du compte qui doit devenir administrateur. Ce compte
--    doit déjà exister dans Authentication → Users ; si ce n'est pas le cas,
--    créez-le d'abord (Add user → Create new user), puis revenez ici.
--
-- Pourquoi c'est nécessaire : les écritures sur `media` sont protégées par la
-- politique RLS `has_role('admin')`. Tant qu'aucun compte ne porte ce rôle,
-- l'administration peut afficher les contenus mais aucun enregistrement n'est
-- accepté par la base.

BEGIN;

-- ------------------------------------------------------------
-- 1) Les trois rôles applicatifs
-- ------------------------------------------------------------
INSERT INTO public.roles (name, description, permissions) VALUES
  ('admin',  'Administrateur complet', '{"all": true}'::jsonb),
  ('editor', 'Peut gérer le contenu',  '{"media": {"create": true, "update": true, "delete": true}, "cantiques": {"read": true}}'::jsonb),
  ('viewer', 'Lecture seule',          '{"media": {"read": true}, "cantiques": {"read": true}}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- ------------------------------------------------------------
-- 2) Rendre la table `roles` lisible aux comptes connectés
-- ------------------------------------------------------------
-- `roles` a le RLS activé mais aucune politique SELECT : la table est donc
-- invisible même pour un administrateur. Le sélecteur de rôle de la console
-- resterait vide et l'attribution de rôle serait impossible depuis l'interface.
-- (La fonction `has_role` n'est pas concernée : elle est SECURITY DEFINER.)
DROP POLICY IF EXISTS "Lecture des roles par les comptes connectes" ON public.roles;
CREATE POLICY "Lecture des roles par les comptes connectes" ON public.roles
  FOR SELECT TO authenticated USING (true);

-- ------------------------------------------------------------
-- 3) Attribuer le rôle « admin » à votre compte
-- ------------------------------------------------------------
-- 👇 REMPLACEZ CETTE ADRESSE
INSERT INTO public.users (id, email, display_name, role_id, is_active)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data ->> 'display_name', split_part(au.email, '@', 1)),
  (SELECT id FROM public.roles WHERE name = 'admin'),
  true
FROM auth.users au
WHERE au.email = 'REMPLACEZ-MOI@exemple.com'
ON CONFLICT (id) DO UPDATE
  SET role_id   = (SELECT id FROM public.roles WHERE name = 'admin'),
      is_active = true,
      email     = EXCLUDED.email;

COMMIT;

-- ------------------------------------------------------------
-- 4) Vérification — doit renvoyer une ligne avec role_name = 'admin'
-- ------------------------------------------------------------
SELECT u.email, r.name AS role_name, u.is_active
FROM public.users u
LEFT JOIN public.roles r ON r.id = u.role_id
ORDER BY u.created_at;

-- Si le résultat est vide : l'adresse de l'étape 3 ne correspond à aucun compte
-- dans Authentication → Users. Vérifiez l'orthographe (la casse compte).
