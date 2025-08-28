FROM node:alpine3.22 AS build

# Directorio de trabajo
WORKDIR /usr/src/app

# Copiar package.json y lock
COPY package*.json ./

# Instalar dependencias (incluyendo dev, porque necesitamos TypeScript)
RUN npm install

# Copiar el resto del código
COPY . .

# Compilar TypeScript a JavaScript (salida en dist/)
RUN npm run build


FROM node:alpine3.22 AS production

# Directorio de trabajo
WORKDIR /usr/src/app

# Copiar solo los package.json (para instalar dependencias de prod)
COPY package*.json ./

# Instalar solo dependencias necesarias para producción
RUN npm install --omit=dev

# Copiar los archivos compilados desde la fase build
COPY --from=build /usr/src/app/dist ./dist

# Exponer el puerto
EXPOSE 3000

# Comando de inicio
CMD ["node", "dist/index.js"]
