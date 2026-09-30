-- Cada usuário autenticado só pode ler e alterar a própria lista.
create table if not exists public.shopping_lists (
  user_id uuid primary key references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.shopping_lists enable row level security;

drop policy if exists "Users can read their own shopping list" on public.shopping_lists;
create policy "Users can read their own shopping list"
  on public.shopping_lists for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own shopping list" on public.shopping_lists;
create policy "Users can create their own shopping list"
  on public.shopping_lists for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own shopping list" on public.shopping_lists;
create policy "Users can update their own shopping list"
  on public.shopping_lists for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Habilita as atualizações da lista em tempo real nos outros aparelhos.
do $$
begin
  alter publication supabase_realtime add table public.shopping_lists;
exception
  when duplicate_object then null;
end $$;
