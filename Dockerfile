# ==============================
# 1. BASE (Společný základ)
# ==============================
FROM node:22-alpine AS base
# Potřebné pro SQLite
RUN apk add --no-cache python3 make g++ 
WORKDIR /usr/src/app

# ==============================
# 2. BACKEND TARGET
# ==============================
FROM base AS backend
WORKDIR /usr/src/app/server

# Kopírujeme jen backend věci
COPY server/package*.json ./
RUN npm install

# Kopírujeme zdrojový kód backendu
COPY server/ .

EXPOSE 6602
CMD ["node", "index.js"]

# ==============================
# 3. FRONTEND TARGET
# ==============================
FROM base AS frontend
WORKDIR /usr/src/app/app

# Kopírujeme jen frontend věci
COPY app/package*.json ./
# Přidáme legacy-peer-deps, kdyby byly konflikty verzí
RUN npm install --legacy-peer-deps 

# Kopírujeme zdrojový kód frontendu
COPY app/ .

# Nastavíme ENV pro build
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# Přijmeme API_URL jako argument pro build, aby Next.js viděl správnou URL už při kompilaci
ARG API_URL
ENV API_URL=$API_URL

# Tady je trik: při buildu Next.js potřebuje vědět URL. 
# Pokud použiješ standalone, není to tak kritické, ale pro statický export ano.
# Prozatím buildneme standardně:
RUN npm run build

EXPOSE 6601
CMD ["npm", "start"]
