-- Deux contenus de démonstration pointent vers des images Unsplash retirées
-- depuis (HTTP 404) : la vignette reste vide sur le site.
-- Remplacées par des illustrations encore servies par Unsplash.

UPDATE media
   SET image = 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=1200&q=80'
 WHERE slug = 'sante-holistique';

UPDATE media
   SET image = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=80'
 WHERE slug = 'adventisme-madagascar';
