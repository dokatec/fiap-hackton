# Estágio 1: Build da aplicação React/Vite
FROM node:20-alpine AS build
WORKDIR /app

# Copia os arquivos de pacotes para otimização de cache de camadas
COPY package*.json ./
RUN npm install

# Copia todo o código-fonte do frontend e compila o projeto
COPY . .
RUN npm run build

# Estágio 2: Servidor de Produção super leve com Nginx
FROM nginx:1.25-alpine

# Copia a build gerada no estágio anterior para o diretório público do Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Expõe a porta padrão HTTP para acesso no navegador
EXPOSE 80

# Inicializa o Nginx em primeiro plano
CMD ["nginx", "-g", "daemon off;"]