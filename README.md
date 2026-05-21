# AgroSolutions Pro — Cooperativa de Agricultura 4.0 🌾🚜

O AgroSolutions Pro é um ecossistema completo de agricultura de precisão desenvolvido para a Fase 5 do Hackaton FIAP (8NETT). A plataforma integra telemetria de sensores IoT em tempo real, mensageria distribuída com alta escalabilidade e uma arquitetura robusta de microsserviços voltada para a gestão territorial e análise preditiva hídrica.

## 📌 Visão Geral do Sistema

A plataforma foi desenhada para resolver o problema de monitorização e irrigação de cooperativas agrícolas em larga escala. Ela monitoriza a humidade do solo, a temperatura e os índices de precipitação dos talhões das herdades cooperadas, gerando alertas dinâmicos instantâneos em caso de iminência de seca.

```text
[ Sensor IoT ] ──(HTTP POST)──> [ Ingestion API ] ──(Publish)──> [ Apache Kafka ]
                                                                        │
                                                                    (Consume)
                                                                        ▼
[ Web Frontend ] ◄──(HTTP)── [ Postgres DB ] ◄──(Persist)── [ Alert Service (Worker) ]
```

## 🛠️ Tecnologias e Infraestrutura

A arquitetura foi construída com pilhas tecnológicas modernas e de alta performance:

- **Frontend:** React (Vite), Tailwind CSS, Lucide Icons, empacotado em servidor web de produção Nginx.
- **Backend:** 4 Microsserviços independentes desenvolvidos em C# (.NET 9.0):
  - **IdentityServiceApi:** Autenticação e autorização via JWT.
  - **PropertyServiceApi:** Cadastro de propriedades rurais e talhões agrícolas.
  - **IngestionServiceApi:** Receção dos dados de telemetria física (Kafka Producer).
  - **AlertServiceApi:** Processador em background (Kafka Consumer Worker) e motor de regras de seca.
- **Banco de Dados:** PostgreSQL unificado para armazenamento transacional das APIs.
- **Mensageria:** Apache Kafka em modo KRaft (sem Zookeeper) de alta vazão de dados.
- **Observabilidade:** Prometheus (raspagem de métricas nativas das APIs) e Grafana para telemetria de infraestrutura.
- **Orquestração e Integração:** Docker Compose com nomes de agrupamento unificados (`agrosolutions`) e manifestos de Deploy preparados para Kubernetes (K8s).

## 📂 Estrutura de Pastas (Monorepo)

O projeto adota o padrão de Monorepo, facilitando o versionamento e a orquestração local:

```text
HACKTON/
├── .github/workflows/   # Pipeline CI/CD do GitHub Actions
├── AlertServiceApi/     # Microsserviço de Alertas (Kafka Consumer)
├── FrontendApp/         # Aplicação SPA React (Vite + Nginx Dockerfile)
├── IdentityServiceApi/  # Microsserviço de Identidade (Auth JWT)
├── IngestionServiceApi/ # Microsserviço de Ingestão de Sensores (Kafka Producer)
├── PropertyServiceApi/  # Microsserviço de Gestão de Herdades e Talhões
├── docker-compose.yml   # Orquestrador local de toda a infraestrutura
└── prometheus.yml       # Configuração de captura de métricas das APIs
```

## 🚀 Como Executar o Projeto

Graças ao empacotamento completo do Frontend e do Backend no Docker, não necessita de instalar o SDK do .NET ou o Node.js na sua máquina física. Apenas precisará do Docker Desktop instalado.

### 1. Clonar o Repositório

```bash
git clone https://github.com/dokatec/fiap-hackton.git
cd fiap-hackton
```

### 2. Subir a Infraestrutura Unificada

Na raiz do projeto (onde está o arquivo `docker-compose.yml`), execute o comando abaixo para compilar e iniciar todos os 9 contêineres:

```bash
docker-compose up -d --build
```

### 3. Mapeamento de Portas Locais

Uma vez concluído o boot das imagens, os serviços estarão acessíveis nas seguintes portas:

| Aplicação / Serviço         | URL de Acesso                                                  | Descrição                            |
| :-------------------------- | :------------------------------------------------------------- | :----------------------------------- |
| **Frontend Web**            | [http://localhost](http://localhost)                           | Painel Dinâmico de Monitoramento     |
| **Identity API (Swagger)**  | [http://localhost:5001/swagger](http://localhost:5001/swagger) | Endpoint de Registo/Login JWT        |
| **Property API (Swagger)**  | [http://localhost:5002/swagger](http://localhost:5002/swagger) | Gestão de Herdades e Talhões         |
| **Ingestion API (Swagger)** | [http://localhost:5003/swagger](http://localhost:5003/swagger) | Simulação de Envio de Sensores       |
| **Alert API (Swagger)**     | [http://localhost:5004/swagger](http://localhost:5004/swagger) | Histórico Físico de Alertas          |
| **Kafka UI**                | [http://localhost:8080](http://localhost:8080)                 | Painel visual de tópicos e partições |
| **Prometheus**              | [http://localhost:9090](http://localhost:9090)                 | Painel de monitorização de métricas  |
| **Grafana**                 | [http://localhost:3000](http://localhost:3000)                 | Dashboard de infraestrutura de rede  |

## 🧪 Roteiro de Testes Recomendado (E2E)

Para validar o fluxo de ponta a ponta, realize os passos abaixo diretamente no navegador:

### Passo 1: Cadastro e Autenticação

1. Aceda ao painel em [http://localhost](http://localhost).
2. Clique no link para criar um novo cadastro. Registe o seu produtor cooperado.
3. Faça o login. O sistema gerará o token JWT e dará acesso ao Dashboard principal.

### Passo 2: Construir o Mapa Agrícola

1. Vá até à aba **Propriedades**.
2. No formulário do painel esquerdo, adicione uma nova propriedade _(Ex: Herdade do Vale Verde)_.
3. No painel direito, associe um novo talhão a essa propriedade _(Ex: Setor Sul, Cultura: Soja, Área: 45 hectares)_.

### Passo 3: Simulação de Sensores (Mensageria Kafka)

1. Vá até à aba **Sensores IoT** ou utilize o bloco **Estado Atual dos Campos** no Dashboard principal.
2. Localize o talhão recém-criado.
3. Clique no botão de **Simulação Crítica (Seca)** ⚠️.
   - O sistema enviará uma requisição POST de 18% de humidade para o `IngestionServiceApi`, que publicará uma mensagem no tópico do Kafka.
   - O `AlertWorker` processará a leitura, identificará a secura extrema e gravará um "Alerta de Seca" no Postgres.
   - O painel do talhão ficará vermelho imediatamente no Dashboard!
4. Agora clique no ícone **Simular Saudável** (gotas verdes) 💧 no mesmo talhão.
   - O sensor publicará uma humidade de 45% na fila.
   - O motor de alertas processará o evento como "Informativo" e salvará a leitura saudável.
   - O talhão no Dashboard voltará instantaneamente a ficar verde ("Saudável"), demonstrando o comportamento real e reativo do sistema!

## ⚙️ Integração Contínua (CI/CD)

O repositório possui uma esteira automatizada de integração contínua baseada em GitHub Actions (`.github/workflows/ci-cd.yml`). A cada push na branch `main`, o pipeline realiza:

- Setup do ambiente .NET 9.x SDK.
- Restauro das dependências NuGet de toda a Solução.
- Build completo em modo Release para verificação de erros de compilação.
- Execução automatizada da suite de testes unitários do backend.
