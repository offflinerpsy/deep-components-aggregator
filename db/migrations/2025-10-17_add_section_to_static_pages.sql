-- Add section column to static_pages
ALTER TABLE static_pages ADD COLUMN IF NOT EXISTS section TEXT CHECK(section IN ('about','help','info'));

-- Backfill section based on existing slug conventions
UPDATE static_pages SET section = CASE
  WHEN slug IN ('about','contacts','vacancies') THEN 'about'
  WHEN slug IN ('faq','delivery','return')     THEN 'help'
  WHEN slug IN ('privacy','terms')             THEN 'info'
  ELSE COALESCE(section, 'info')
END;

-- Create index for section (optional for filtering/grouping)
-- SQLite does not support IF NOT EXISTS for index names in older versions; wrap in try/catch at runner level if needed
CREATE INDEX IF NOT EXISTS idx_static_pages_section ON static_pages(section);


