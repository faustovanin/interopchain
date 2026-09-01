# Ambiente distribuído do Data Steward

Este diretório contém a infraestrutura distribuída do projeto com:
- API Gateway
- Kafka e Kafka UI
- IPFS
- Microsserviços de crypto, storage, metadata e audit

## Pré-requisitos

Antes de iniciar, certifique-se de ter instalado:
- Docker Desktop
- Docker Compose v2
- Git

> O ambiente foi preparado para rodar com Docker. Se o Docker não estiver disponível, os containers não poderão subir.

## 1. Entrar na pasta do ambiente

```bash
cd data-steward
```

## 2. Configurar variáveis de ambiente

O arquivo [example.env](example.env) já está preparado com alguns dos valores base para o ambiente distribuído. Se quiser começar a partir do exemplo, execute:

```bash
cp example.env .env
```

Altere os valores restantes com as informações necessárias.

### AWS KMS

O serviço `metadata-crypto` usa AWS KMS para criptografar a chave AES e re-encriptar a chave para outro usuário. Garanta que o ambiente de execução tenha credenciais válidas e permissões para as seguintes ações KMS:

- `kms:Encrypt`
- `kms:Decrypt`
- `kms:ReEncrypt*`

O campo `patients.kms_key_id` deve armazenar um ARN ou alias KMS, por exemplo:

- `arn:aws:kms:us-east-1:123456789012:key/11111111-2222-3333-4444-555555555555`
- `alias/patient001`

## 3. Subir a rede distribuída

### Rodar em bash

Se estiver usando Windows, é preferível rodar os comandos em bash:

Subir tudo em bash (linux)
```bash
wsl -d ubuntu
cd "/data-steward"
wsl --shutdown #Depois para sair
```

Os próximos comandos dentro da wsl (Windows)

```bash
docker compose up -d --build
```

Esse comando irá criar e iniciar:
- Gateway em `http://localhost:3000`
- Kafka UI em `http://localhost:8080`
- IPFS API em `http://localhost:5001`

### Netbird
Para usar a rede privada, deve-se entrar no container com netbird e rodar:
```bash
netbird up
```

e seguir as instruções. Com ele, um novo IP vai ser alocado para sua máquina, este sendo usado para os IPs dos IPFS e outros serviços.

## 4. Verificar se os serviços estão ativos

```bash
docker compose ps
```

Você deve ver os containers do gateway, kafka, ipfs-node, storage, metadata-crypto e audit em estado `Up`.

## 5. Testar o fluxo de upload

Exemplo de requisição para o gateway:

```bash
curl -X POST http://localhost:3000/resources \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "Patient",
    "id": "patient-001",
    "subject": {
      "reference": "Patient/patient-001"
    }
  }'
```

Se tudo estiver correto, o gateway retornará um `202 Accepted` com um `requestId`.

## 6. Acompanhar os eventos

- Kafka UI: http://localhost:8080
- Logs dos serviços:

```bash
docker compose logs -f gateway storage metadata-crypto audit
```

## Estrutura do fluxo

1. O gateway publica o evento `resource.upload.requested` no Kafka.
2. O serviço de metadata-crypto extrai metadados, criptografa o recurso e publica `resource.ready.storage`.
3. O serviço de storage consome `resource.ready.storage`, armazena no IPFS e persiste no Postgres.
4. O serviço de audit acompanha a cadeia completa de eventos.

## Solução de problemas

### Docker não inicia
- Verifique se o Docker Desktop está aberto.
- Confirme se o daemon do Docker está rodando.

### Container com erro de inicialização
```bash
docker compose logs <nome-do-servico>
```

### Porta já ocupada
Verifique se alguma das portas abaixo já está em uso:
- `3000` (gateway)
- `8080` (Kafka UI)
- `9092` (Kafka)
- `5001` (IPFS)

## Interromper

Para parar sem perder dados:

```bash
docker compose stop
```

E depois subir de novo:

```bash
docker compose start
```

## Encerramento

Para parar a rede:

```bash
docker compose down
```

Para remover também os volumes:

```bash
docker compose down -v
```
