FROM node:20-alpine

WORKDIR /app

# 依存パッケージは無い（server.mjs・ai-interview-prototype配下はNode標準機能のみで動く）ため、
# package.jsonはengines/scriptsのメタ情報の反映のみを目的にコピーする。
COPY package.json ./
COPY server.mjs ./
COPY ai-interview-prototype ./ai-interview-prototype

ENV NODE_ENV=production
ENV HOST=0.0.0.0
# Cloud RunはPORTを自動的に注入する（未指定時はserver.mjs側のデフォルト8000を使う）。
EXPOSE 8000

CMD ["node", "server.mjs"]
