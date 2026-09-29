-- ============================================================
-- COMPTE DE TEST — à supprimer après la phase de mise au point
-- ============================================================
--
-- Confirme l'adresse du compte de test et lui donne le rôle admin, pour
-- pouvoir exercer l'interface d'administration de bout en bout.
--
-- Le compte a été créé par inscription publique ; il ne peut pas se connecter
-- tant que son adresse n'est pas confirmée, d'où la première instruction.

-- 1) Confirmer l'adresse
UPDATE auth.users
   SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
 WHERE email = 'adventools.dev.test@gmail.com';

-- 2) Profil applicatif avec le rôle admin
INSERT INTO public.users (id, email, display_name, role_id, is_active)
SELECT id, email, 'Compte de test', (SELECT id FROM public.roles WHERE name = 'admin'), true
  FROM auth.users
 WHERE email = 'adventools.dev.test@gmail.com'
ON CONFLICT (id) DO UPDATE
   SET role_id = (SELECT id FROM public.roles WHERE name = 'admin'),
       is_active = true;


-- ============================================================
-- SUPPRESSION — à lancer une fois la mise au point terminée
-- ============================================================
-- DELETE FROM public.users WHERE email = 'adventools.dev.test@gmail.com';
-- DELETE FROM auth.users   WHERE email = 'adventools.dev.test@gmail.com';
