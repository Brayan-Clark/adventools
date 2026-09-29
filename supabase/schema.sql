-- ============================================================
-- ANDEAHA HIZAH A - Supabase Schema
-- ============================================================

-- Activer l'extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES UTILISATEURS & RÔLES
-- ============================================================

-- Table des rôles
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rôles par défaut
INSERT INTO roles (name, description, permissions) VALUES
  ('admin', 'Administrateur complet', '{"all": true}'::jsonb),
  ('editor', 'Peut gérer le contenu', '{"media": {"create": true, "update": true, "delete": true}, "cantiques": {"read": true}}'::jsonb),
  ('viewer', 'Lecture seule', '{"media": {"read": true}, "cantiques": {"read": true}}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Table des utilisateurs (liée à auth.users de Supabase)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  role_id UUID REFERENCES roles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);

-- ============================================================
-- TABLES CONTENU (géré par l'admin)
-- ============================================================

-- Catégories
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name_fr TEXT NOT NULL,
  name_mg TEXT NOT NULL,
  icon TEXT DEFAULT 'book',
  color TEXT DEFAULT 'indigo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO categories (slug, name_fr, name_mg, icon, color) VALUES
  ('etude-biblique', 'Étude biblique', 'Fianarana Baiboly', 'book', 'indigo'),
  ('louange-adoration', 'Louange & adoration', 'Fiderana sy fanompoam-pivavahana', 'music', 'gold'),
  ('famille-mariage', 'Famille & mariage', 'Fianakaviana sy fanambadiana', 'heart', 'rose'),
  ('jeunesse', 'Jeunesse', 'Tanora', 'flame', 'orange'),
  ('prophetie', 'Prophétie & révélation', 'Faminaniana sy fanambarana', 'scroll', 'emerald'),
  ('priere', 'Prière & méditation', 'Vavaka sy fisaintsainana', 'sparkles', 'sky')
ON CONFLICT (slug) DO NOTHING;

-- Media (sermons, cours, audio, séminaires, conférences, articles)
CREATE TABLE IF NOT EXISTS media (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('sermon', 'course', 'audio', 'seminar', 'conference', 'article')),
  slug TEXT UNIQUE NOT NULL,
  title_fr TEXT NOT NULL,
  title_mg TEXT,
  description_fr TEXT DEFAULT '',
  description_mg TEXT DEFAULT '',
  content_fr TEXT DEFAULT '',
  content_mg TEXT DEFAULT '',
  speaker TEXT DEFAULT '',
  image TEXT DEFAULT '',
  video_url TEXT DEFAULT '',
  audio_url TEXT DEFAULT '',
  duration TEXT DEFAULT '',
  date TEXT DEFAULT '',
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  featured BOOLEAN DEFAULT false,
  views INTEGER DEFAULT 0,
  lessons JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les recherches media
CREATE INDEX IF NOT EXISTS idx_media_type ON media(type);
CREATE INDEX IF NOT EXISTS idx_media_slug ON media(slug);
CREATE INDEX IF NOT EXISTS idx_media_category ON media(category_id);
CREATE INDEX IF NOT EXISTS idx_media_featured ON media(featured);
CREATE INDEX IF NOT EXISTS idx_media_date ON media(date DESC);
CREATE INDEX IF NOT EXISTS idx_media_tags ON media USING GIN(tags);

-- Versets du jour
CREATE TABLE IF NOT EXISTS verses (
  id SERIAL PRIMARY KEY,
  text_fr TEXT NOT NULL,
  text_mg TEXT NOT NULL,
  reference TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index du verset du jour
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- ============================================================
-- TABLES SYNC (depuis adventools - lecture seule)
-- ============================================================

-- Cantiques (sync depuis adventools/hymnes)
CREATE TABLE IF NOT EXISTS cantiques (
  id TEXT PRIMARY KEY,
  num INTEGER,
  title TEXT NOT NULL,
  key TEXT,
  author TEXT DEFAULT '',
  categories TEXT DEFAULT '',
  content TEXT DEFAULT '',
  playback TEXT DEFAULT '',
  source TEXT DEFAULT '',
  lang TEXT NOT NULL CHECK (lang IN ('mg', 'fr', 'en')),
  recueil TEXT DEFAULT '',
  sync_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cantiques_lang ON cantiques(lang);
CREATE INDEX IF NOT EXISTS idx_cantiques_num ON cantiques(num);
CREATE INDEX IF NOT EXISTS idx_cantiques_recueil ON cantiques(recueil);

-- Mofonaina (sync depuis adventools/mofonaina)
CREATE TABLE IF NOT EXISTS mofonaina (
  date TEXT PRIMARY KEY,
  titre_du_jour TEXT NOT NULL,
  verset_texte TEXT NOT NULL,
  verset_reference TEXT NOT NULL,
  contenu TEXT DEFAULT '',
  content TEXT DEFAULT '',
  source TEXT DEFAULT '',
  sync_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mofonaina_date ON mofonaina(date);

-- ============================================================
-- SÉCURITÉ - Row Level Security (RLS)
-- ============================================================

-- Activer RLS sur toutes les tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE verses ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cantiques ENABLE ROW LEVEL SECURITY;
ALTER TABLE mofonaina ENABLE ROW LEVEL SECURITY;

-- Politiques pour les tables publiques (lecture pour tous)
CREATE POLICY "Lecture publique cantiques" ON cantiques FOR SELECT USING (true);
CREATE POLICY "Lecture publique mofonaina" ON mofonaina FOR SELECT USING (true);
CREATE POLICY "Lecture publique media" ON media FOR SELECT USING (true);
CREATE POLICY "Lecture publique categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Lecture publique verses" ON verses FOR SELECT USING (true);
-- Les rôles doivent rester lisibles par les comptes connectés : sans cette
-- politique, la jointure `role:roles(*)` revient vide et l'interface prend un
-- administrateur pour un visiteur.
CREATE POLICY "Lecture des roles par les comptes connectes"
  ON roles FOR SELECT TO authenticated USING (true);

-- Politiques pour les utilisateurs authentifiés
CREATE POLICY "Utilisateurs peuvent voir leur profil" ON users FOR SELECT USING (auth.uid() = id);

-- AUTO-VALIDATION : un utilisateur connecté (compte créé via le dashboard ou
-- l'admin) peut créer son propre profil au premier login. Le rôle est NULL
-- (aucun accès) jusqu'à ce qu'un admin lui attribue un rôle (admin/editor/viewer).
CREATE POLICY "Utilisateurs peuvent créer leur profil" ON users
  FOR INSERT WITH CHECK (auth.uid() = id AND role_id IS NULL);

-- Fonction pour vérifier le rôle
CREATE OR REPLACE FUNCTION has_role(role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid() AND r.name = role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Politiques pour les admins
CREATE POLICY "Admins peuvent tout gérer sur media" ON media
  FOR ALL USING (has_role('admin'))
  WITH CHECK (has_role('admin'));

CREATE POLICY "Admins peuvent tout gérer sur categories" ON categories
  FOR ALL USING (has_role('admin'))
  WITH CHECK (has_role('admin'));

CREATE POLICY "Admins peuvent tout gérer sur verses" ON verses
  FOR ALL USING (has_role('admin'))
  WITH CHECK (has_role('admin'));

CREATE POLICY "Admins peuvent tout gérer sur settings" ON settings
  FOR ALL USING (has_role('admin'))
  WITH CHECK (has_role('admin'));

CREATE POLICY "Admins peuvent gérer les utilisateurs" ON users
  FOR ALL USING (has_role('admin'))
  WITH CHECK (has_role('admin'));

CREATE POLICY "Admins peuvent gérer cantiques" ON cantiques
  FOR ALL USING (has_role('admin'))
  WITH CHECK (has_role('admin'));

CREATE POLICY "Admins peuvent gérer mofonaina" ON mofonaina
  FOR ALL USING (has_role('admin'))
  WITH CHECK (has_role('admin'));

-- Politiques pour les editors
CREATE POLICY "Editors peuvent créer media" ON media
  FOR INSERT WITH CHECK (has_role('editor') OR has_role('admin'));

CREATE POLICY "Editors peuvent modifier media" ON media
  FOR UPDATE USING (has_role('editor') OR has_role('admin'));

CREATE POLICY "Editors peuvent supprimer media" ON media
  FOR DELETE USING (has_role('editor') OR has_role('admin'));

-- ============================================================
-- FONCTIONS UTILES
-- ============================================================

-- Fonction pour incrémenter les vues
CREATE OR REPLACE FUNCTION increment_views(media_id INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE media SET views = views + 1 WHERE id = media_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir le verset du jour
CREATE OR REPLACE FUNCTION get_verse_of_day()
RETURNS verses AS $$
DECLARE
  verse_record verses%ROWTYPE;
  verse_index INTEGER;
  verse_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO verse_count FROM verses;
  IF verse_count = 0 THEN
    RETURN NULL;
  END IF;

  SELECT value::INTEGER INTO verse_index FROM settings WHERE key = 'verse_index';
  verse_index := COALESCE(verse_index, 0);

  SELECT * INTO verse_record FROM verses
  ORDER BY id
  OFFSET (verse_index % verse_count)
  LIMIT 1;

  RETURN verse_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_media_updated_at BEFORE UPDATE ON media
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_cantiques_updated_at BEFORE UPDATE ON cantiques
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_mofonaina_updated_at BEFORE UPDATE ON mofonaina
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

-- Créer les buckets de stockage
INSERT INTO storage.buckets (id, name, public) VALUES
  ('audio', 'audio', false),
  ('images', 'images', true),
  ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Politiques de stockage
-- Lecture : fichiers publics (images) ou connecté (audio/documents pour l'admin)
CREATE POLICY "Images publiques" ON storage.objects FOR SELECT
  USING (bucket_id = 'images');

CREATE POLICY "Fichiers privés pour membres connectés" ON storage.objects FOR SELECT
  USING (bucket_id IN ('audio', 'documents') AND auth.role() = 'authenticated');

-- Écriture : admins et editors uniquement
CREATE POLICY "Admins et editors peuvent uploader" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id IN ('audio', 'images', 'documents')
    AND (has_role('admin') OR has_role('editor'))
  );

CREATE POLICY "Admins et editors peuvent modifier" ON storage.objects FOR UPDATE
  USING (has_role('admin') OR has_role('editor'));

CREATE POLICY "Admins et editors peuvent supprimer" ON storage.objects FOR DELETE
  USING (has_role('admin') OR has_role('editor'));
