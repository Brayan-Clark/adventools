-- Correctif : la table `roles` avait RLS activé sans aucune politique, donc
-- elle était illisible pour tout le monde. Deux symptômes en découlaient :
--
--   1. getCurrentUser() lit le rôle par jointure (`role:roles(*)`), qui
--      revenait vide : l'interface considérait un administrateur comme simple
--      visiteur, alors que la base le reconnaissait bien — has_role() est en
--      SECURITY DEFINER et contourne RLS, d'où la contradiction.
--   2. getRoles() renvoyait une liste vide : aucune option dans le sélecteur
--      de rôle de la gestion des utilisateurs.
--
-- Lecture réservée aux comptes connectés : l'interface d'administration en a
-- besoin, les visiteurs anonymes non.
CREATE POLICY "Lecture des roles par les comptes connectes"
  ON roles FOR SELECT
  TO authenticated
  USING (true);
