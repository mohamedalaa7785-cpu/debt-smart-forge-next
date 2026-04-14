-- Round 4: security/performance index alignment

create unique index if not exists users_email_uidx on public.users (email);
create index if not exists clients_created_by_idx on public.clients (created_by);
create index if not exists clients_created_at_idx on public.clients (created_at);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at);
