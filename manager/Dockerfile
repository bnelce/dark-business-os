# Imagem única para app e worker: mesmo código, comandos diferentes.
# Multi-stage só para não carregar cache de build na imagem final.

FROM node:24-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# basePath precisa existir no build: o Next assa o prefixo nos assets e rotas.
# Passar só em runtime quebra /_next/ e todos os links.
ARG NEXT_PUBLIC_BASE_PATH=""
ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH
RUN npx prisma generate && npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
# O worker roda por tsx a partir do fonte, então a imagem carrega node_modules
# completo e o src — não vale a pena um segundo pipeline para economizar disco
# numa VM com 63 GB livres.
COPY --from=build /app ./
EXPOSE 3100
CMD ["npx", "next", "start", "-p", "3100", "-H", "0.0.0.0"]
