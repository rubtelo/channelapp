# Usamos una imagen de Node con soporte para Debian
FROM node:20

# Instalamos las dependencias necesarias para Puppeteer y Chromium
RUN apt-get update && apt-get install -y \
    gpg \
    gnupg \
    wget \
    ca-certificates \
    apt-transport-https \
    curl \
    --no-install-recommends \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Definimos variables de entorno para que Puppeteer use el Chrome instalado
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /app

# Copiamos archivos de dependencias
COPY package*.json ./

# Instalamos dependencias
RUN npm install

# Copiamos el resto del código
COPY . .

# Construimos el frontend (esto genera la carpeta /dist)
RUN npm run build

# Exponemos el puerto que usa Express
EXPOSE 3001

# Iniciamos el servidor
CMD ["node", "server/index.js"]
