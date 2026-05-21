# Estágio 1: Build
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /app

# Copia os arquivos de projeto primeiro para otimizar o cache de camadas do Docker
COPY *.csproj ./
RUN dotnet restore

# Copia o restante dos arquivos e compila
COPY . ./
RUN dotnet publish -c Release -o out

# Estágio 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app/out .

# Porta padrão exposta pelo .NET em containers
EXPOSE 8080

# Este comando inteligente garante que o Docker execute o projeto principal
# mesmo que existam DLLs de terceiros (como Confluent.Kafka) na pasta.
ENTRYPOINT ["sh", "-c", "dotnet $(ls *.runtimeconfig.json | sed 's/.runtimeconfig.json/.dll/')"]