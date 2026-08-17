# Printly Suprimentos v0.2.1

Catálogo público de links de afiliados + painel administrativo protegido por Supabase Auth e Row Level Security (RLS).

## O que já está pronto

- Catálogo público sem login ou cadastro.
- Busca, categorias, filtro por loja e ordenação.
- Links de afiliados por produto.
- Painel administrativo em `/admin/` sem link visível no catálogo.
- Login somente por e-mail/senha.
- Sem cadastro público de usuários.
- Produtos salvos online no Supabase.
- Visitantes podem apenas ler produtos ativos.
- Somente o administrador autorizado pode inserir, editar ou excluir.
- Importador por URL tenta trazer título, descrição, imagem e preço quando a página disponibiliza esses metadados.
- Produto ativo/inativo, destaque, selo, preço anterior, tags e ordem manual.

## 1. Testar o visual agora

Execute `ABRIR_LOCAL.bat` e abra:

- Catálogo: http://localhost:8080/
- Painel: http://localhost:8080/admin/

Sem Supabase configurado, o catálogo usa `data/products.json` como demonstração. O painel mostrará que a configuração está pendente.

## 2. Criar o banco seguro no Supabase

1. Crie um projeto em https://supabase.com/.
2. No projeto, abra **SQL Editor** > **New query**.
3. Copie TODO o conteúdo de `sql/01_SETUP_COMPLETO.sql`, cole e clique em **Run**.
4. Abra **Authentication > Users**.
5. Use **Add user > Create new user** e crie apenas o seu usuário administrativo com e-mail e uma senha forte.
6. Abra novamente o SQL Editor.
7. Abra `sql/02_DEFINIR_ADMIN.sql` deste pacote.
8. Troque `SEU_EMAIL_ADMIN_AQUI` pelo e-mail criado e execute.
9. Em **Authentication > Providers > Email**, mantenha login por e-mail/senha e desative novos cadastros públicos se essa opção estiver habilitada no seu projeto. Não há botão de cadastro no site.

## 3. Conectar o site ao Supabase

No Supabase, localize:

- Project URL
- Publishable key (ou anon key em projetos que ainda mostram a nomenclatura antiga)

Abra `assets/js/config.js` e substitua:

```js
SUPABASE_URL: 'COLE_AQUI_A_PROJECT_URL',
SUPABASE_PUBLISHABLE_KEY: 'COLE_AQUI_A_PUBLISHABLE_KEY',
```

NUNCA coloque no site uma Secret key ou service_role. O navegador usa somente a chave pública; a autorização de escrita é feita pelo RLS.

Depois salve o arquivo e atualize o navegador.

## 4. Como usar o painel

Abra `/admin/`.

1. Entre com o e-mail e senha que você criou no Supabase.
2. Clique em `+ Novo` ou selecione um produto existente.
3. Para tentar puxar dados automaticamente, cole a URL original do produto em **Importação rápida por URL** e clique em **Puxar dados**.
4. Confira os campos.
5. Cole o seu **link de afiliado** no campo específico.
6. Clique em **Salvar produto**.

A alteração fica disponível no catálogo público imediatamente após uma nova leitura da página.

## 5. Publicar no GitHub Pages

### Criar o repositório

1. No GitHub, clique em **New repository**.
2. Nome sugerido: `printly-suprimentos`.
3. Para o teste, pode ser público.
4. Clique em **Create repository**.

### Enviar estes arquivos

1. Dentro do repositório, clique em **Add file > Upload files**.
2. Arraste TODO o conteúdo que está dentro da pasta `Printly_Suprimentos_v0.2.1`.
3. Garanta que `index.html` fique na raiz do repositório, e não dentro de uma pasta extra.
4. Clique em **Commit changes**.

A raiz deve ficar parecida com:

```text
index.html
admin.html
admin/
assets/
data/
sql/
.nojekyll
README.md
```

### Ativar GitHub Pages

1. Abra **Settings** do repositório.
2. Clique em **Pages**.
3. Em **Build and deployment**, escolha **Deploy from a branch**.
4. Branch: `main`.
5. Folder: `/(root)`.
6. Clique em **Save**.

A URL normalmente ficará parecida com:

`https://SEU-USUARIO.github.io/printly-suprimentos/`

Painel administrativo:

`https://SEU-USUARIO.github.io/printly-suprimentos/admin/`

## 6. Segurança

O arquivo `admin/index.html` é público como qualquer arquivo hospedado no GitHub Pages. Isso não é um problema: abrir a página não concede acesso.

A proteção real está em duas camadas:

1. Supabase Auth valida o e-mail e a senha.
2. RLS no PostgreSQL só permite escrita quando o `auth.uid()` do usuário aparece em `admin_users`.

Mesmo alguém conhecendo `/admin/` e a Publishable key do site, não poderá inserir, atualizar ou excluir produtos sem autenticação e autorização no banco.

## 7. Integração com o Printly desktop

Você pode abrir o catálogo já filtrado:

- `?categoria=Filamentos`
- `?material=PLA`
- `?busca=PETG`

Exemplo:

`https://SEU-USUARIO.github.io/printly-suprimentos/?material=PLA`

Isso permite que a aba **Comprar Suprimentos** do Printly abra exatamente o material relacionado ao projeto ou estoque do usuário.
