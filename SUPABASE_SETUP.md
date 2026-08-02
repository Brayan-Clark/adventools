# 🚀 Mise en route : Andeaha Hizaha sur GitHub Pages + Supabase

Ce projet est **100 % statique** (GitHub Pages). Les données dynamiques
(sermons, cours, audio, utilisateurs, rôles) vivent dans **Supabase**, et les
données de référence (cantiques, mofonanaina, bible) sont soit chargées
directement depuis le dépôt `adventools`, soit synchronisées dans Supabase.

---

## 1. Créer le compte Supabase

1. Va sur [supabase.com](https://supabase.com) et crée un compte (gratuit).
2. Crée un **nouveau projet** (ex. `andeaha-hizaha`).
3. Note l'**URL du projet** et l'**anon key** (Settings → API).
4. Copie aussi la **service_role key** (réservée aux scripts côté serveur —
   jamais exposée dans le navigateur).

## 2. Appliquer le schéma SQL

1. Dans le dashboard Supabase, ouvre l'onglet **SQL Editor**.
2. Colle tout le contenu de `supabase/schema.sql`.
3. **Exécute**. Cela crée les tables, rôles, politiques RLS, et les fonctions
   `has_role`, `increment_views`, `get_verse_of_day`.

## 3. Déployer l'Edge Function (création d'utilisateurs admin)

```bash
# depuis le dossier du projet
npx supabase login
npx supabase link --project-ref <ref-du-projet>
npx supabase functions deploy admin-create-user
```

Cela permet à l'admin de créer des comptes **uniquement** (pas de registre public).

## 4. Configurer les variables d'environnement

Copie `.env.example` vers `.env` et remplis :

```env
PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...   # uniquement pour le script de sync
```

Le préfixe `PUBLIC_` est important : Vite intègre ces valeurs dans le bundle
client au build. La clé anon est **publique par conception** ; la sécurité des
données repose sur le **RLS**.

## 5. Créer le premier compte admin

Depuis le dashboard Supabase :

1. Onglet **Authentication** → *Add user* (email + mot de passe).
2. Puis dans **SQL Editor**, exécute (remplace l'email) :

```sql
INSERT INTO public.users (id, email, role_id, is_active)
SELECT u.id, u.email, r.id, true
FROM auth.users u, public.roles r
WHERE u.email = 'toto@exemple.com' AND r.name = 'admin';
```

## 6. Synchroniser les données adventools → Supabase

Les cantiques et méditations sont dans `Brayan-Clark/adventools` (branche `data`).

**Option A — script local** (premier remplissage) :
```bash
SUPABASE_URL=<url> SUPABASE_ANON_KEY=<clé> SUPABASE_SERVICE_ROLE_KEY=<clé> npm run sync
```

**Option B — chargement direct** : les pages cantiques / bible / mofonanaina
téléchargent les données directement depuis les URLs raw GitHub au chargement
(rien à dupliquer en base pour ces modules).

## 7. Déployer sur GitHub Pages

1. Pousse le code sur une **branche dédiée** du dépôt `adventools`
   (ex. `andeahi hahaza`), ou sur un dépôt séparé.
2. Dans les **Settings du dépôt** → *Secrets and variables* → *Actions*, ajoute :
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
3. Dans *Settings* → *Pages*, choisis **GitHub Actions** comme source.
4. Pousse un commit — le workflow `.github/workflows/deploy.yml` construit et
   déploie automatiquement.

---

## Sécurité

- **Pas de registre public** : seuls les comptes créés par un admin existent.
- **RLS** active sur toutes les tables : lecture publique limitée au contenu,
  écriture réservée à `admin` / `editor`.
- La clé `service_role` ne quitte jamais le serveur (Edge Functions / scripts).