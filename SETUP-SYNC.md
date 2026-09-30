# Configurar sincronização entre celular e computador

O site é publicado como uma página estática. Para compartilhar a lista entre aparelhos, este projeto usa Supabase Auth e uma tabela Postgres protegida por Row Level Security (RLS). Cada conta só pode acessar a própria lista.

## 1. Criar o projeto Supabase

1. Crie um projeto em [supabase.com](https://supabase.com/).
2. No SQL Editor do projeto, execute todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql).
3. Em **Project Settings → API Keys**, copie a **Project URL** e a chave **Publishable** (`sb_publishable_...`). A chave antiga `anon` também pode ser usada.

Não use a chave `service_role` no site. A chave pública pode estar no navegador porque as políticas RLS limitam o acesso à lista do usuário autenticado.

## 2. Configurar cadastro e retorno por e-mail

Em **Authentication → URL Configuration**:

- Site URL: `https://leandrosj.github.io/Papel-de-poposao/`
- Adicione esse mesmo endereço à lista de **Redirect URLs**.

O cadastro pode exigir confirmação por e-mail, conforme a configuração de confirmação de e-mail do projeto. Depois de confirmar, entre no app com o mesmo e-mail e senha em cada aparelho.

## 3. Configurar a publicação do GitHub Pages

No repositório GitHub, abra **Settings → Secrets and variables → Actions → Variables** e crie estas variáveis do repositório:

| Nome | Valor |
|---|---|
| `VITE_SUPABASE_URL` | A Project URL do Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | A chave Publishable (ou a chave `anon` antiga) |

Depois, abra **Actions → Deploy to GitHub Pages → Run workflow** para publicar o app com a configuração. A chave Publishable é própria para uso no cliente; nunca coloque `service_role` nessas variáveis.

## Como será a primeira sincronização

- Se a conta ainda não tiver lista na nuvem, a lista deste aparelho será enviada.
- Se já houver lista na nuvem e outra lista salva neste aparelho, o app pergunta se você quer usar uma, a outra ou mesclar.
- Na mesclagem, produtos com o mesmo nome, categoria e unidade ficam uma vez; em caso de diferença, os dados da nuvem são mantidos.
- Depois de entrar com a mesma conta nos dois aparelhos, as alterações são sincronizadas e a lista continua disponível localmente para uso quando estiver sem conexão.
