-- Enable fuzzy search + vector similarity for client intelligence.
create extension if not exists pg_trgm;
create extension if not exists vector;

alter table public.documents
  add column if not exists embedding vector(512);

create index if not exists documents_embedding_ivfflat_idx
  on public.documents
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists clients_name_trgm_idx
  on public.clients
  using gin (name gin_trgm_ops);

create index if not exists client_phones_phone_trgm_idx
  on public.client_phones
  using gin (phone gin_trgm_ops);
