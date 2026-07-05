# O Que Vou Levar pro Arraiá?

App Angular (standalone components, lazy loading por feature) para organizar a divisão de pratos e bebidas de uma Festa Junina. Não tem backend próprio: fala direto com o Supabase via `supabase.rpc(...)`, usando apenas a chave **publicável**.

## Rodando localmente

```bash
npm install
ng serve
```

Acesse `http://localhost:4200`.

## Configuração do Supabase

Edite `src/environments/environment.ts` (e `environment.prod.ts`) com sua URL e chave publicável do projeto Supabase:

```ts
export const environment = {
  production: false,
  supabaseUrl: 'https://SEU-PROJETO.supabase.co',
  supabasePublishableKey: 'sb_publishable_...',
  relatorioPassword: 'troque-esta-senha',
};
```

**Nunca** use a chave secreta (`sb_secret_...`) no frontend — ela ignora o RLS e é exclusiva de backend.

### Funções RPC necessárias

O app chama as seguintes funções via `supabase.rpc(...)` (ver [`supabase.service.ts`](src/app/core/services/supabase.service.ts)):

| Função | Parâmetros | Retorno |
|---|---|---|
| `listar_itens_disponiveis()` | — | `{ id, nome, categoria, quantidade_pessoas, observacao }[]` |
| `listar_participantes_disponiveis()` | — | `{ id, nome }[]` (quem ainda não reservou) |
| `listar_todos_participantes()` | — | `{ id, nome }[]` (todos) |
| `reservar(p_item, p_participantes)` | bigint, bigint[] | void |
| `reserva_do_participante(p_participante)` | bigint | `{ item, observacao }` ou vazio |
| `relatorio_por_participante()` | — | `{ participante, item }[]` |
| `relatorio_por_item()` | — | `{ item, categoria, participante }[]` |

Todo o SQL (incluindo a migração de `estoque` para `quantidade_pessoas`) está comentado no topo de `supabase.service.ts`, pronto para rodar no SQL Editor do Supabase.

### Modelo de reserva: grupo fechado por item

Cada item não tem mais estoque avulso — ele define `quantidade_pessoas`, o tamanho exato do grupo que precisa assumi-lo junto (ex.: um item de "Hot dog" com `quantidade_pessoas = 3` só é assumido quando 3 pessoas são selecionadas de uma vez). A reserva é tudo-ou-nada: `reservar(p_item, p_participantes)` recebe um array com exatamente `quantidade_pessoas` ids e insere uma linha em `reservas` para cada participante numa única chamada; se qualquer um deles já tiver uma reserva, a função inteira falha (nada é salvo). Um item deixa de aparecer em `listar_itens_disponiveis()` assim que qualquer linha existir em `reservas` para ele — não existe reserva parcial.

A função `reservar` levanta uma exceção com a mensagem `Item esgotado` quando o item já foi assumido por outro grupo, e `Este participante ja reservou um item` quando algum dos participantes selecionados já tem reserva — o app trata essas duas mensagens especificamente para exibir o aviso correto.

Não existe mais um seletor fixo de "seu nome" na tela principal — o app não sabe quem é o usuário do dispositivo. Em vez disso, um botão "🔍 Já escolhi algo?" abre um modal onde a pessoa escolhe o próprio nome só para consultar (via `reserva_do_participante`) se já está em algum grupo, sem travar os botões "Assumir" da tela.

`item.categoria` é texto livre — o app não assume valores fixos. Os botões de filtro, os títulos de seção e o emoji de cada item são gerados dinamicamente a partir dos valores distintos encontrados em `listar_itens_disponiveis()` (ver [`categoria.util.ts`](src/app/shared/utils/categoria.util.ts)). O emoji é escolhido por palavra-chave (`salg`, `doc`/`sobremesa`, `beb`, `apoio`, `prato`), com 🎪 como fallback para categorias não reconhecidas.

## Relatório protegido por senha

A rota `/relatorio` pede a senha definida em `relatorioPassword` (ver [`relatorio-guard.ts`](src/app/features/relatorio/relatorio-guard.ts)). A autorização fica apenas em memória (nada de `localStorage`), então é perdida a cada recarregamento de página.

**Importante sobre segurança:** como o app não tem backend, `relatorio_por_participante()` e `relatorio_por_item()` precisam ser `security definer` liberadas para `anon` (assim como as demais funções). Isso significa que a senha do `/relatorio` é apenas uma barreira na SPA — qualquer pessoa com a chave publicável (que já é pública no bundle JS) tecnicamente poderia chamar essas duas funções direto. Se isso for um problema, a alternativa é não conceder `anon`/`authenticated` nessas duas funções e o organizador consultar o relatório direto no SQL Editor do Supabase (com `service_role`), removendo a tela `/relatorio` do app.

## Build e deploy no GitHub Pages

```bash
# instalar dependência de deploy
npm install --save-dev angular-cli-ghpages

# build para GitHub Pages (substitua NOME-DO-REPO pelo nome real do repositório)
ng build --base-href /NOME-DO-REPO/ --configuration production

# publicar
npx angular-cli-ghpages --dir=dist/festa-junina-app/browser
```

O roteamento já usa `withHashLocation()` (ver [`app.config.ts`](src/app/app.config.ts)), então não há 404 ao recarregar a página em produção.
