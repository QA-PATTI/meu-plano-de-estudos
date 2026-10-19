# Meu Plano de Estudos

Aplicação didática do curso **Desenvolvimento Web com IA**.

O estudante organiza o que precisa aprender, muda o andamento de cada tarefa e vê o progresso. Nesta versão não existe login: todas as pessoas que acessam a mesma instalação veem e podem alterar as mesmas tarefas. Não cadastre informações pessoais.

```text
Navegador                         API                         Banco
HTML, CSS e JavaScript            Node.js e Express           PostgreSQL
na Vercel                         no Render                   no Neon

        |  HTTP + JSON (Fetch)          |  SQL parametrizado
        |------------------------------->|--------------------------->
        |<-------------------------------|<---------------------------
```

O navegador nunca recebe a senha do banco. Ele só conhece o endereço da API, configurado em `frontend/config.js`. A string de conexão fica no backend, na variável `DATABASE_URL`.

## Estrutura do projeto

```text
meu-plano-de-estudos/
├── frontend/
│   ├── index.html       Página da aplicação
│   ├── style.css        Aparência e layout responsivo
│   ├── script.js        Comportamento da página e chamadas à API
│   └── config.js        Endereço público da API
├── backend/
│   ├── server.js        Rotas HTTP, validação e respostas JSON
│   ├── database.js      Conexão PostgreSQL com TLS
│   ├── package.json     Dependências e comando npm start
│   ├── package-lock.json  Versões exatas instaladas pelo npm
│   └── .env.example     Modelo das variáveis de ambiente
├── database/
│   ├── schema.sql       Cria a tabela tarefas
│   └── dados-exemplo.sql  Cinco tarefas opcionais, só para demonstração
├── .gitignore
├── README.md
└── render.yaml          Blueprint opcional do Web Service no Render
```

O arquivo `backend/.env` é criado por você na sua máquina. Ele não entra no Git.

---

## Parte 1 — Conceitos

### O que é frontend

Frontend é a parte que a pessoa vê e usa no navegador. Neste projeto são três arquivos: `index.html` descreve a estrutura, `style.css` define cores e layout, e `script.js` reage aos cliques. O JavaScript busca e envia dados com a Fetch API. Não há React, Angular, Vue nem etapa de build.

### O que é backend

Backend é o programa que fica no servidor. Ele recebe pedidos HTTP, valida os dados, consulta o banco e devolve JSON. Aqui o backend é um processo Node.js com Express. O comando que o coloca no ar é `npm start`, que executa `node server.js`.

### O que é uma API REST

Uma API REST é um conjunto de endereços HTTP com responsabilidades claras. O cliente diz o que quer pelo método e pelo caminho:

| Método | Significado neste projeto |
|---|---|
| GET | Ler dados |
| POST | Criar uma tarefa |
| PUT | Substituir os dados de uma tarefa |
| DELETE | Apagar uma tarefa |

O corpo das mensagens usa JSON. O status HTTP resume o resultado: 200 sucesso, 201 criado, 204 excluído, 400 dados inválidos, 404 não encontrado, 500 erro interno e 503 banco indisponível.

### O que é PostgreSQL

PostgreSQL é o banco relacional que guarda as tarefas. Os dados ficam na tabela `tarefas`, em um serviço Neon. O backend fala com ele por SQL. As consultas usam parâmetros (`$1`, `$2`...), então um texto digitado no formulário não vira comando SQL.

### O que é deploy

Deploy é publicar a aplicação em um servidor acessível pela internet. Neste curso cada camada tem um serviço:

| Camada | Onde publicar |
|---|---|
| Frontend estático | Vercel |
| API Node.js | Render |
| PostgreSQL | Neon |
| Código-fonte | GitHub |

Publicar não cria login nem torna os dados privados. Quem souber a URL consegue usar a aplicação.

### Como as camadas se comunicam

1. A pessoa abre o site na Vercel.
2. O navegador carrega HTML, CSS, JavaScript e `config.js`.
3. `script.js` chama `https://sua-api.onrender.com/api/tarefas`.
4. O Express valida o pedido e executa um `SELECT` no Neon.
5. O PostgreSQL devolve as linhas.
6. A API transforma as linhas em JSON.
7. O navegador monta os cards com `textContent`, sem inserir HTML digitado pelo usuário.

O CORS entra só no passo 3. Ele é uma regra do navegador sobre qual site pode ler a resposta da API. Não é autenticação. Um programa como `curl.exe` não é limitado pelo CORS e consegue chamar a API se souber o endereço.

---

## Parte 2 — Executando localmente

Os comandos abaixo são para o PowerShell do Windows. Abra um terminal em cada etapa que precisar ficar em execução.

### 1. Instalar o Node.js

Instale a versão LTS em [https://nodejs.org](https://nodejs.org). Feche e abra o terminal. Confira:

```powershell
node -v
npm -v
```

Use Node.js 20 ou mais novo.

### 2. Abrir o projeto

No Cursor ou no VS Code, escolha **File > Open Folder** e abra a pasta `meu-plano-de-estudos`.

### 3. Criar uma conta no Neon

Acesse [https://neon.tech](https://neon.tech) e crie uma conta gratuita.

### 4. Criar um banco PostgreSQL

No Neon, crie um projeto. O serviço cria um banco PostgreSQL. Você pode manter o nome sugerido.

Se o painel oferecer **direct** e **pooled**, escolha a conexão **direct**. Esta API já administra um pequeno conjunto de conexões.

### 5. Copiar a string de conexão

No painel do Neon, copie a connection string. Ela se parece com isto, mas a sua terá usuário, senha e host reais:

```text
postgresql://usuario:senha@ep-exemplo.sa-east-1.aws.neon.tech/neondb?sslmode=require
```

Trate essa URL como uma senha. Não a coloque no frontend, no README, em print ou no Git.

### 6. Configurar o arquivo .env

No PowerShell, a partir da pasta do projeto:

```powershell
cd backend
Copy-Item .env.example .env
notepad .env
```

Deixe o arquivo assim, com a sua URL no lugar do exemplo:

```env
PORT=3000
DATABASE_URL=postgresql://usuario:senha@ep-exemplo.sa-east-1.aws.neon.tech/neondb?sslmode=require
FRONTEND_URL=http://localhost:5500
```

Cole a URL sem aspas. Se a senha contiver `#`, use aspas duplas na linha inteira, porque no `.env` o `#` inicia um comentário:

```env
DATABASE_URL="postgresql://..."
```

Salve e feche o bloco de notas. O arquivo `.env` fica só na sua máquina.

### 7. Executar o schema.sql

O backend não cria a tabela sozinho.

No Neon, abra o **SQL Editor**, cole todo o conteúdo de `database/schema.sql` e execute. O script usa `CREATE TABLE IF NOT EXISTS`. Ele não apaga dados e não recria uma tabela que já existe.

Se você já tiver o programa `psql` instalado, também pode rodar, a partir da pasta do projeto:

```powershell
psql "postgresql://usuario:senha@host/banco?sslmode=require" -f database\schema.sql
```

### Dados de exemplo

O arquivo `database/dados-exemplo.sql` é opcional. Ele insere cinco tarefas:

1. Aprender HTML — Concluído
2. Estudar CSS — Estudando
3. Praticar JavaScript — A estudar
4. Entender APIs REST — A estudar
5. Aprender backend com Node.js — A estudar

Execute esse arquivo manualmente no SQL Editor, somente se quiser dados para demonstração. Não o configure para rodar no Render. Executar de novo cria tarefas repetidas.

### 8. Instalar as dependências

Ainda dentro da pasta `backend`:

```powershell
npm install
```

Esse comando cria a pasta `node_modules` e o arquivo `package-lock.json`. A pasta `node_modules` não vai para o GitHub. O `package-lock.json` vai, para o Render instalar as mesmas versões.

### 9. Executar o backend

```powershell
npm start
```

A API fica em [http://localhost:3000](http://localhost:3000), escutando em `0.0.0.0`. Deixe esse terminal aberto. Para parar, use `Ctrl+C`.

Se `DATABASE_URL` estiver ausente, o terminal mostra uma mensagem de configuração. A API sobe mesmo assim, e `/api/health` responde 503 até a variável ser corrigida.

Abra outro terminal e teste:

```powershell
curl.exe -s http://localhost:3000/api/health
```

Com o Neon configurado e a tabela criada, a resposta esperada é:

```json
{"status":"ok","banco":"conectado"}
```

`/api/health` só confirma que a API alcançou o PostgreSQL. Se a tabela ainda não existir, a saúde pode estar ok e a listagem de tarefas explica que falta executar `schema.sql`.

### 10. Executar o frontend

O frontend precisa de um servidor HTTP local. Abrir o arquivo direto pelo disco (`file://`) faz o navegador bloquear as chamadas à API.

A origem local autorizada pelo CORS é a porta **5500**. Use um destes modos.

**Python**, em um segundo terminal, a partir da pasta do projeto:

```powershell
cd frontend
python -m http.server 5500
```

Depois abra [http://localhost:5500](http://localhost:5500).

**Extensão Live Server** do VS Code ou Cursor: clique com o botão direito em `frontend/index.html` e escolha **Open with Live Server**. Nas configurações, fixe a porta:

```json
"liveServer.settings.port": 5500
```

Se o Live Server abrir em outra porta, o navegador mostra um erro de CORS. Ajuste a porta ou acesse exatamente `http://localhost:5500`. `http://127.0.0.1:5500` também é aceito.

### Exemplos de requisições HTTP

Estes exemplos usam `curl.exe` no PowerShell. As aspas simples evitam que o PowerShell altere o JSON.

Saúde da API:

```powershell
curl.exe -s http://localhost:3000/api/health
```

Listar tarefas:

```powershell
curl.exe -s http://localhost:3000/api/tarefas
```

Buscar uma tarefa:

```powershell
curl.exe -s http://localhost:3000/api/tarefas/1
```

Cadastrar:

```powershell
curl.exe -s -X POST "http://localhost:3000/api/tarefas" -H "Content-Type: application/json" -d '{"titulo":"Revisar rotas HTTP","descricao":"Testar GET, POST, PUT e DELETE","materia":"Backend","data_prevista":"2026-11-01","status":"A estudar"}'
```

A resposta de criação usa o status **201** e devolve a tarefa com `id`.

Atualizar. Troque `1` pelo id real:

```powershell
curl.exe -s -X PUT "http://localhost:3000/api/tarefas/1" -H "Content-Type: application/json" -d '{"titulo":"Revisar rotas HTTP","descricao":"Testar GET, POST, PUT e DELETE","materia":"Backend","data_prevista":"2026-11-01","status":"Estudando"}'
```

Excluir:

```powershell
curl.exe -s -i -X DELETE "http://localhost:3000/api/tarefas/1"
```

A exclusão concluída responde **204** e não traz corpo.

Identificador inválido, resposta **400**:

```powershell
curl.exe -s -i http://localhost:3000/api/tarefas/abc
```

Tarefa inexistente, resposta **404**, quando o banco está configurado:

```powershell
curl.exe -s -i http://localhost:3000/api/tarefas/999999
```

Dados inválidos, resposta **400**:

```powershell
curl.exe -s -X POST "http://localhost:3000/api/tarefas" -H "Content-Type: application/json" -d '{"titulo":"","materia":"Backend","status":"Quase"}'
```

Os status aceitos são exatamente `A estudar`, `Estudando` e `Concluído`. Os campos aceitos são `titulo`, `descricao`, `materia`, `data_prevista` e `status`.

### Contrato da API

| Método | Endpoint | Sucesso | Erros comuns |
|---|---|---|---|
| GET | `/api/health` | 200 com banco conectado | 503 se o banco estiver indisponível ou sem `DATABASE_URL` |
| GET | `/api/tarefas` | 200 e uma lista, a mais recente primeiro | 500 ou 503 |
| GET | `/api/tarefas/:id` | 200 e uma tarefa | 400 id inválido, 404 não encontrada |
| POST | `/api/tarefas` | 201 e a tarefa criada | 400 dados inválidos |
| PUT | `/api/tarefas/:id` | 200 e a tarefa atualizada | 400, 404 |
| DELETE | `/api/tarefas/:id` | 204 sem corpo | 400, 404 |

Erros de validação e de operação respondem com `{ "erro": "mensagem em português" }`. A API não devolve senha, string de conexão nem detalhes internos do PostgreSQL.

Regras dos campos:

| Campo | Regra |
|---|---|
| titulo | Obrigatório, texto, de 1 a 150 caracteres |
| descricao | Opcional, texto, até 1000 caracteres |
| materia | Obrigatória, texto, de 1 a 100 caracteres |
| data_prevista | Opcional, formato `AAAA-MM-DD` |
| status | `A estudar`, `Estudando` ou `Concluído`. Na criação, a ausência usa `A estudar` |

### Problemas comuns no computador local

| O que você vê | O que fazer |
|---|---|
| Mensagem no terminal sobre `DATABASE_URL` | Confira o arquivo `backend/.env` e reinicie o `npm start` |
| Saúde com `"banco":"desconectado"` | Confira a URL do Neon, a internet e se o projeto Neon está ativo |
| Listagem diz que a tabela não existe | Execute `database/schema.sql` no SQL Editor |
| A página fica em “Erro de comunicação com a API” | Confira se o backend está rodando e se `config.js` aponta para `http://localhost:3000` |
| Erro de CORS no console do navegador | Sirva o frontend em `http://localhost:5500` ou `http://127.0.0.1:5500` |
| A porta 3000 já está em uso | Altere `PORT` no `.env` e use a mesma porta em `config.js` |

---

## Parte 3 — GitHub

O Git registra o histórico do código. O GitHub guarda esse histórico na internet para a Vercel e o Render lerem.

Instale o Git em [https://git-scm.com/download/win](https://git-scm.com/download/win) se `git --version` não funcionar.

Na pasta `meu-plano-de-estudos`:

```powershell
git init
git add .
git status
```

Leia a lista do `git status` antes de continuar. Ela pode mostrar o código, o `package-lock.json` e o `.env.example`. Ela não pode mostrar `backend/.env` nem `node_modules`. Se o `.env` aparecer, pare e confira o `.gitignore`.

```powershell
git commit -m "Cria a aplicação Meu Plano de Estudos"
git branch -M main
```

No GitHub, crie um repositório vazio com o nome `meu-plano-de-estudos`. Não marque a opção de criar README, porque esta pasta já tem um. Depois envie o código, trocando `USUARIO` pelo seu usuário:

```powershell
git remote add origin https://github.com/USUARIO/meu-plano-de-estudos.git
git push -u origin main
```

O GitHub pede autenticação. Use o login do navegador ou um token pessoal. Não coloque o token dentro de nenhum arquivo do projeto.

Quando alterar `config.js` para a URL do Render, repita:

```powershell
git add .
git status
git commit -m "Aponta o frontend para a API publicada"
git push
```

---

## Parte 4 — Deploy do backend no Render

1. Crie uma conta em [https://render.com](https://render.com).
2. Conecte a conta ao GitHub e autorize o repositório do projeto.
3. Escolha **New +** e depois **Web Service**.
4. Selecione o repositório `meu-plano-de-estudos`.
5. Use estas configurações:

| Campo | Valor |
|---|---|
| Name | `meu-plano-de-estudos-api` |
| Region | a mais próxima de você |
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance Type | Free |

6. Em **Environment Variables**, adicione:

| Chave | Valor |
|---|---|
| `DATABASE_URL` | a string de conexão do Neon |
| `FRONTEND_URL` | a origem do frontend. No primeiro deploy pode ficar `http://localhost:5500`; depois troque pela URL `https://...vercel.app` |

Não marque essas variáveis como visíveis em logs se o painel oferecer essa opção. Não as escreva no `render.yaml`.

7. Em **Health Check Path**, informe `/api/health`.
8. Crie o serviço e acompanhe o log. O comando de start precisa ser `npm start`. O processo escuta `process.env.PORT` e o endereço `0.0.0.0`, que é o que o Render exige.
9. Quando o deploy terminar, abra `https://SEU-SERVICO.onrender.com/api/health`.

Resposta esperada:

```json
{"status":"ok","banco":"conectado"}
```

Se a resposta for 503 com `"banco":"nao_configurado"`, a variável `DATABASE_URL` não chegou ao serviço. Se for `"banco":"desconectado"`, a URL está presente, mas o Neon não aceitou a conexão. Ajuste a variável e salve. O Render inicia um novo deploy.

O plano gratuito adormece depois de um tempo sem visitas. A primeira chamada pode levar cerca de um minuto. Espere e tente de novo antes de concluir que a API quebrou. O Neon gratuito também pode suspender o banco; a primeira consulta depois disso é mais lenta.

O arquivo `render.yaml` descreve o mesmo Web Service e pode ser usado como Blueprint. O caminho manual acima é suficiente para o curso. O Blueprint não cria PostgreSQL no Render, porque o banco permanece no Neon. Os valores secretos continuam sendo digitados no painel (`sync: false`).

---

## Parte 5 — Deploy do frontend na Vercel

Publique a API antes do site, porque o frontend precisa da URL pública do Render.

1. Crie uma conta em [https://vercel.com](https://vercel.com).
2. Conecte o GitHub.
3. Importe o repositório `meu-plano-de-estudos`.
4. Em **Root Directory**, selecione `frontend`.
5. Configure como site estático, sem build:
   - Framework Preset: **Other**
   - Build Command: vazio
   - Output Directory: o padrão da pasta selecionada, em geral `.` ou vazio
   - Install Command: vazio, se o painel mostrar esse campo
6. Antes de publicar, edite `frontend/config.js` e troque o endereço local pela URL do Render, sem barra no final e sem `/api`:

```javascript
window.APP_CONFIG = {
  API_URL: "https://meu-plano-de-estudos-api.onrender.com"
};
```

Não coloque `DATABASE_URL` nesse arquivo. Faça commit e `git push`. A Vercel publica os arquivos que estão no GitHub.

7. Confirme o deploy. A Vercel mostra uma URL parecida com `https://meu-plano-de-estudos.vercel.app`.
8. Volte ao Render e altere `FRONTEND_URL` para essa origem exata, com `https://` e sem caminho no final. Salve. O Render faz um novo deploy para aplicar o CORS.
9. Espere o backend ficar saudável e abra o site da Vercel. Cadastre uma tarefa, atualize a página e confirme que ela continua lá.

O navegador só libera a chamada se a origem da página for idêntica a `FRONTEND_URL` ou for um dos endereços locais de desenvolvimento. `https://meu-site.vercel.app` e `https://meu-site-git-main.vercel.app` são origens diferentes. Use a URL que está na barra de endereço.

---

## Parte 6 — Validação final

Confira cada item com a aplicação publicada:

| Verificação | Como confirmar |
|---|---|
| Frontend na internet | A URL da Vercel abre a página Meu Plano de Estudos |
| Backend no Render | `/api/health` responde JSON |
| Banco no Neon | O campo `banco` da saúde é `conectado` |
| Cadastro | Uma tarefa nova aparece na lista |
| Edição | O botão Editar altera título, matéria, descrição, data ou status |
| Exclusão | O botão Excluir pede confirmação e a tarefa some |
| Status | Mudar o seletor do card atualiza a cor e os indicadores |
| Filtros | Todas, A estudar, Estudando e Concluídas mostram só o grupo escolhido |
| Progresso | A porcentagem segue concluídas dividido pelo total. Sem tarefas, fica 0% |
| Persistência no navegador | Atualizar a página mantém as tarefas |
| Persistência no servidor | Parar e iniciar o backend de novo mantém as tarefas, porque elas estão no Neon |

No celular, a mesma URL deve mostrar os indicadores empilhados, o formulário em uma coluna e os botões em largura confortável para o toque.

---

## Segurança desta versão

- O backend valida tipo, presença, tamanho, data e status.
- O SQL usa parâmetros. O texto da tarefa não é concatenado na consulta.
- Senhas e a `DATABASE_URL` ficam fora do Git, do frontend e das respostas JSON.
- A conexão com o Neon usa TLS e mantém a verificação do certificado ligada.
- A página escreve os textos do usuário com `textContent`.
- O CORS limita quais sites podem ler a API no navegador. Ele não substitui autenticação nem autorização.
- Não há login. Qualquer pessoa com a URL da instalação pode listar, criar, editar e excluir tarefas.

O `.gitignore` deixa de fora `node_modules/`, `.env`, `.env.*` (com exceção de `.env.example`), logs e arquivos de sistema.

## Tecnologias

| Parte | Escolha |
|---|---|
| Frontend | HTML5, CSS3, JavaScript puro e Fetch API |
| Backend | Node.js LTS, Express, `pg`, `cors` e `dotenv` |
| Banco | PostgreSQL no Neon |
| Publicação | GitHub, Vercel, Render e Neon |

Não fazem parte desta versão: React, TypeScript, ORM, SQLite, Docker, microsserviços, autenticação e serviços pagos.

## Próximos passos do curso

Quando a base estiver clara, o próximo tema natural é separar os dados por pessoa, com autenticação. Até lá, mantenha esta instalação como demonstração e sem dados pessoais.
