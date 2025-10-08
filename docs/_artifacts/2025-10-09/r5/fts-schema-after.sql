search_rows_fts|CREATE VIRTUAL TABLE search_rows_fts USING fts5(
  mpn,
  manufacturer,
  title,
  description,
  content='search_rows',
  content_rowid='rowid',
  tokenize="unicode61 remove_diacritics 2 tokenchars '-._'",
  prefix='2 3 4'
)
search_rows_fts_config|CREATE TABLE 'search_rows_fts_config'(k PRIMARY KEY, v) WITHOUT ROWID
search_rows_fts_data|CREATE TABLE 'search_rows_fts_data'(id INTEGER PRIMARY KEY, block BLOB)
search_rows_fts_docsize|CREATE TABLE 'search_rows_fts_docsize'(id INTEGER PRIMARY KEY, sz BLOB)
search_rows_fts_idx|CREATE TABLE 'search_rows_fts_idx'(segid, term, pgno, PRIMARY KEY(segid, term)) WITHOUT ROWID
