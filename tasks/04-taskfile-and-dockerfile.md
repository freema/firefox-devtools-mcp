Title: 04 – Taskfile.yaml a Dockerfile

Cíl

- Připravit `Taskfile.yaml` (task runner) a `Dockerfile` pro pohodlný build/spuštění a ladění přes Inspector.

Taskfile.yaml (inspirováno `old/mcp_gsheet/Taskfile.yaml`)

```yaml
version: '3'

tasks:
  default:
    desc: Show available tasks
    cmds:
      - task --list

  install:
    desc: Install dependencies
    cmds:
      - npm install

  build:
    desc: Build the project
    cmds:
      - npm run build

  dev:
    desc: Run in development mode with hot reload
    cmds:
      - npm run dev

  start:
    desc: Run the production build
    deps: [build]
    cmds:
      - npm start

  inspector:
    desc: Run MCP inspector for debugging
    deps: [build]
    cmds:
      - npm run inspector

  inspector:dev:
    desc: Run MCP inspector in development mode
    cmds:
      - npm run inspector:dev

  clean:
    desc: Clean build artifacts
    cmds:
      - rm -rf dist
      - rm -rf node_modules
      - rm -f package-lock.json

  check:
    desc: Run lint fixer + typecheck
    cmds:
      - npm run lint:fix
      - npm run typecheck
```

Dockerfile (RDP, bez Playwright)

- Cíl: mít Node image s nainstalovaným Firefoxem. Server se připojí k běžícímu Firefoxu (RDP) na hostiteli, nebo ve stejné kontejnerové síti.

Varianta A – Debian/Ubuntu base + Firefox

```Dockerfile
FROM node:22-bookworm
RUN apt-get update && \
    apt-get install -y firefox-esr && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["node", "dist/index.js"]
```

Poznámky

- V CI lze spouštět Firefox mimo kontejner a připojit se přes `RDP_HOST`/`RDP_PORT`.
- Pokud budete Firefox startovat ze serveru, dodejte proměnnou `FIREFOX_PATH` a příslušný launcher (samostatná iterace).

Reference

- `old/mcp_gsheet/Taskfile.yaml`
- `old/mcp_gsheet/Dockerfile` (jen jako formát; závislosti přizpůsobit RDP přístupu)

Akceptační kritéria

- `task inspector` spustí build a otevře Inspector.
- Kontejner nastartuje server: `docker build . && docker run --rm <image>`.
