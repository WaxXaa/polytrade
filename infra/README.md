# Deploy en AWS

## Arquitectura

```
Internet → ALB → ECS Fargate (Frontend nginx:80)
                → ECS Fargate (Backend node:3000/3001)
                              → EFS (SQLite persistente)
                              → Secrets Manager (PRIVATE_KEY)
```

## Prerequisitos

1. AWS CLI configurado con permisos de admin
2. Una VPC con al menos 2 subnets públicas en diferentes AZs
3. Repositorio en GitHub

## Paso 1 — Configurar GitHub Secrets

En tu repo GitHub → Settings → Secrets → Actions, agrega:

| Secret | Valor |
|--------|-------|
| `AWS_ACCESS_KEY_ID` | Tu AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Tu AWS secret key |
| `AWS_VPC_ID` | ID de tu VPC (ej: `vpc-0abc123`) |
| `AWS_SUBNET_IDS` | Subnets separadas por coma (ej: `subnet-0abc,subnet-0def`) |

## Paso 2 — Primer deploy manual (crea la infraestructura)

```bash
# 1. Crear los repositorios ECR primero
aws ecr create-repository --repository-name polymarket-backend-production --region us-east-1
aws ecr create-repository --repository-name polymarket-frontend-production --region us-east-1

# 2. Deploy del stack de CloudFormation (sin imágenes aún)
aws cloudformation deploy \
  --template-file infra/cloudformation.yml \
  --stack-name polymarket-agent-production \
  --parameter-overrides \
    Environment=production \
    BackendImage=nginx:alpine \
    FrontendImage=nginx:alpine \
    VpcId=vpc-XXXXXXXX \
    SubnetIds=subnet-XXXXXXXX,subnet-YYYYYYYY \
  --capabilities CAPABILITY_NAMED_IAM
```

## Paso 3 — Actualizar el secret con tu private key

```bash
# Obtener el ARN del secret
SECRET_ARN=$(aws cloudformation describe-stacks \
  --stack-name polymarket-agent-production \
  --query "Stacks[0].Outputs[?OutputKey=='SecretArn'].OutputValue" \
  --output text)

# Actualizar con tu private key real
aws secretsmanager update-secret \
  --secret-id $SECRET_ARN \
  --secret-string '{
    "PRIVATE_KEY": "0xTU_PRIVATE_KEY_AQUI",
    "CLOB_API_KEY": "",
    "CLOB_SECRET": "",
    "CLOB_PASSPHRASE": ""
  }'
```

## Paso 4 — Deploy automático

Haz push a `main` y GitHub Actions se encarga del resto:

```bash
git add .
git commit -m "feat: initial deploy"
git push origin main
```

El pipeline:
1. Construye las imágenes Docker
2. Las sube a ECR
3. Actualiza el CloudFormation stack
4. Hace rolling deploy en ECS

## Paso 5 — Obtener la URL

```bash
aws cloudformation describe-stacks \
  --stack-name polymarket-agent-production \
  --query "Stacks[0].Outputs[?OutputKey=='ALBDnsName'].OutputValue" \
  --output text
```

## Costos estimados (us-east-1)

| Recurso | Costo/mes |
|---------|-----------|
| ECS Fargate (0.25 vCPU, 0.5GB × 2) | ~$15 |
| ALB | ~$20 |
| EFS (mínimo) | ~$1 |
| ECR storage | ~$1 |
| Secrets Manager | ~$0.40 |
| **Total** | **~$37/mes** |

## Notas de seguridad

- La `PRIVATE_KEY` nunca toca el código ni el repositorio — solo vive en Secrets Manager
- El backend la lee en runtime via `AWS_SECRET_NAME`
- El ECS task role solo tiene permisos para leer ese secret específico
- El SQLite se persiste en EFS — sobrevive reinicios del contenedor
