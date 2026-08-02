// Script de (re)seed de la base SQLite : node scripts/seed.ts
import { seedFromJson, getDb, ensureSchema } from '../src/lib/db.ts';

ensureSchema(getDb());
getDb().exec('DELETE FROM media; DELETE FROM verses; DELETE FROM categories;');
seedFromJson(getDb());
console.log('✓ Base SQLite recréée et peuplée depuis data/content.json');
