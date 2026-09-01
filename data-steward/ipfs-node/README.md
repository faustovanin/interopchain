# Nó IPFS adicional para a rede distribuída

Esta pasta permite subir mais nós IPFS em outras máquinas e conectá-los a um nó IPFS já existente.

## Como usar

1. Copie esta pasta para outra máquina.
2. Edite o arquivo `.env` ou `peers.env`.
3. Gere uma swarm.key que deve ser igual para cada no.
4. Defina `IPFS_BOOTSTRAP_PEERS` com o peer do nó principal, por exemplo:
5. Descomente o servico do netbird em ipfs-node/docker-compose.yml. Assim, um netbird ira ser gerado junto com o no ipfs.

```bash
IPFS_BOOTSTRAP_PEERS=/ip4/SEU_HOST/tcp/4001/p2p/SEU_PEER_ID
```

6. Inicie o nó:

```bash
docker compose up -d --build
```

### IMPORTANTE

Alguns arquivos `.sh` podem estar como CRLF. Dentro de sua IDE, você deve mudar todos os arquivos `.sh` para LF.

Arquivos `.sh` podem ser encontrados em `ipfs-node/ipfs`.


## Pontos de acesso
- API IPFS: http://localhost:5001
- Gateway: http://localhost:8080
- Swarm: tcp://localhost:4001

## Observação
O nó novo se conectará ao bootstrap informado e participará da mesma rede de peers.

Deve ser iniciado o netbird dentro do container:
```bash
netbird up
```

## Se precisar, conecte manualmente com outros nós
Dentro do docker com o IPFS, rode:
```bash
ipfs swarm connect /ip4/SEU_HOST/tcp/4001/p2p/SEU_PEER_ID
```


# Conectar nó AWS
## Subir

Instanciar nova máquina no EC2:
- Launch Instance Ubuntu Server 24.04 LTS
- Create Key Pair RSA .pem 
- Security Group 
- Entrada SSH - Source My IP 
- Elastic IP - opcional, terá o mesmo ip toda vez

## Conectar
Entrar em nó AWS

```bash
ssh -i key.pem ubuntu@IP_PUBLICO
```

## Instalar dependências
```bash
sudo apt update sudo apt upgrade -y
sudo apt install docker.io docker-compose-v2 git -y
sudo usermod -aG docker ubuntu
newgrp docker
docker --version
docker compose version
```

Copiar arquivos para maquina AWS. Lembrar de alterar .env e swarm.key. Alterar caminho da chave e caminho dos arquivos.
```bash
scp -i "key.pem" -r "ipfs-node" ubuntu@IP_PUBLICO:~
```

Instalar netbird.
```bash
curl -fsSL https://pkgs.netbird.io/install.sh | sudo bash sudo netbird up
```

Descobrir IP.
```bash
ip addr - descobrir wt0
```
Testar docker.
```bash
docker run hello-world
```

Subir netbird.
```bash
netbird up
```


### Se precisar, conecte manualmente com outros nós
Dentro do docker com o IPFS, rode:
```bash
ipfs swarm connect /ip4/SEU_HOST/tcp/4001/p2p/SEU_PEER_ID
```


Depois pode ser iniciado com:
```bash
docker compose start
```
E parado com:
```bash
docker compose stop
```
