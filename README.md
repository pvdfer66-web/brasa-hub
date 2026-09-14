# Gruposzap18 — Hub de Grupos (backend Python)

Backend em **FastAPI** que serve o site público e o painel admin, e guarda os grupos no **Firestore** (via `firebase-admin`, do lado do servidor). O navegador nunca fala diretamente com o Firebase — tudo passa pela API em Python.

## 1. Pré-requisitos: chave de serviço do Firebase

1. No [console do Firebase](https://console.firebase.google.com), abra o projeto que você já usa (o mesmo do Firestore criado antes).
2. Vá em **Configurações do projeto (engrenagem) > Contas de serviço**.
3. Clique em **Gerar nova chave privada** — baixa um arquivo `.json`.
4. Renomeie esse arquivo para `serviceAccountKey.json` e coloque na raiz desta pasta (`hub/serviceAccountKey.json`).
   ⚠️ Esse arquivo dá acesso total ao seu Firebase — nunca compartilhe ou suba pro GitHub (já está no `.gitignore`).
5. Se o Firestore do projeto ainda não existir, crie em **Build > Firestore Database**.
6. (Opcional, mas recomendado) Publique as novas regras do Firestore, que agora bloqueiam qualquer acesso direto do navegador — só o backend Python acessa:
   ```bash
   firebase deploy --only firestore:rules --project SEU_PROJETO
   ```
   (usa o `firestore.rules` desta pasta; precisa do Firebase CLI — veja `npm install -g firebase-tools` se ainda não tiver).

## 2. Configurar variáveis de ambiente

Copie `.env.example` para `.env` e edite:

```bash
cp .env.example .env
```

```
SECRET_KEY=uma-string-aleatoria-bem-longa       # usada para assinar o cookie de sessão do admin
ADMIN_PASSWORD=escolha-uma-senha-forte           # senha do painel admin
FIREBASE_CREDENTIALS=serviceAccountKey.json
```

## 3. Instalar dependências e rodar

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt

uvicorn app.main:app --reload --port 8000
```

Abra:
- **Site público:** http://localhost:8000/
- **Painel admin:** http://localhost:8000/admin.html (login com a senha do `.env`)

> Importante: rode o `uvicorn` a partir da raiz da pasta `hub/` (onde está a pasta `static/`), senão o servidor não encontra os arquivos do site.

## Como funciona a autenticação do admin

Não usa mais o Firebase Authentication — o login do painel é uma senha única (`ADMIN_PASSWORD`) verificada pelo próprio backend Python. Ao logar, o servidor cria um cookie de sessão assinado (`brasa_session`, `httpOnly`) válido por 7 dias. Toda escrita no Firestore (`POST`/`DELETE` em `/api/groups`) exige esse cookie válido; a leitura (`GET /api/groups`) é pública, para o site funcionar sem login.

## Estrutura

```
hub/
  app/
    main.py             # rotas da API (login, logout, CRUD de grupos)
    auth.py             # sessão do admin (cookie assinado)
    firebase_client.py  # conexão com o Firestore via firebase-admin
    schemas.py          # modelos Pydantic (Group, LoginRequest)
  static/
    index.html           # site público
    admin.html            # painel admin
    app.js                 # lê /api/groups e monta os cards
    admin.js                # login + cadastro/remoção de grupos
    styles.css              # tema vermelho e preto
  requirements.txt
  .env.example
  firestore.rules
```

## Próximos passos (se quiser)

Isso roda localmente por enquanto. Pra colocar no ar de verdade, esse backend Python precisa de um host que rode Python (o Firebase Hosting sozinho não roda) — por exemplo **Google Cloud Run**, **Render** ou **Railway**. Se quiser, me chama que eu monto o deploy quando for a hora.
