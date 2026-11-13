# SpeedPilot — Deployment & Infrastructure Guide

**Document Version:** 1.0.0  

---

## 1. Overview & Architecture Topology

SpeedPilot is designed for flexible deployment:
1. **Self-Hosted Community Edition:** A single virtual machine running Docker Compose (PostgreSQL, Redis, Next.js Web, BullMQ Worker).
2. **High-Availability Cloud Edition:** Managed PostgreSQL (e.g. AWS RDS or Supabase), managed Redis (e.g. Upstash or AWS ElastiCache), serverless or containerized Web app (Vercel or AWS ECS), and scalable worker nodes on AWS ECS/Fargate or Railway.

```mermaid
flowchart TD
    Internet["Public Traffic / HTTPS"] --> ReverseProxy["Reverse Proxy (Nginx / Cloudflare)"]
    
    ReverseProxy -->|Port 3000| WebApp["SpeedPilot Web (apps/web)"]
    
    subgraph DataTier [Data Tier]
        Postgres[(PostgreSQL 16)]
        Redis[(Redis 7)]
    end
    
    WebApp --> Postgres
    WebApp --> Redis
    
    subgraph WorkerCluster [Worker Cluster]
        Worker1["BullMQ Worker Node 1"]
        Worker2["BullMQ Worker Node 2"]
    end
    
    Worker1 --> Redis
    Worker1 --> Postgres
    Worker2 --> Redis
    Worker2 --> Postgres
```

---

## 2. Docker Compose Local & Self-Hosted Stack

The root `docker-compose.yml` provides a production-grade container topology:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: speedpilot-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: speedpilot
      POSTGRES_USER: speedpilot
      POSTGRES_PASSWORD: ${DB_PASSWORD:-speedpilot_secret}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U speedpilot -d speedpilot"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: speedpilot-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    container_name: speedpilot-web
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  worker:
    build:
      context: .
      dockerfile: apps/worker/Dockerfile
    container_name: speedpilot-worker
    restart: unless-stopped
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

volumes:
  postgres_data:
  redis_data:
```

---

## 3. Environment Variables Reference

| Variable | Description | Required | Default |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | Yes | `postgresql://speedpilot:password@localhost:5432/speedpilot` |
| `REDIS_URL` | Redis connection URL | Yes | `redis://localhost:6379` |
| `GOOGLE_PAGESPEED_API_KEY` | Google PageSpeed Insights API Key | Recommended | None (PSI will operate in unauthenticated low-quota mode if omitted) |
| `GOOGLE_CRUX_API_KEY` | Chrome UX Report API Key | Recommended | Same as PSI key |
| `OPENAI_API_KEY` | OpenAI API Key for AI Fix Assistant | Optional | None (Non-AI auditing remains fully operational without it) |
| `AI_PROVIDER` | LLM Provider (`openai`, `gemini`, `anthropic`) | Optional | `openai` |
| `AI_MODEL` | LLM Model Name | Optional | `gpt-4o-mini` |
| `APP_URL` | Canonical frontend URL | Yes | `http://localhost:3000` |
| `SESSION_SECRET` | 32+ character random secret for session encryption | Yes | Auto-validated on boot |

---

## 4. Production Checklist

1. **Database Migrations:** Run `npx prisma migrate deploy` in the database package prior to booting web/worker containers.
2. **Reverse Proxy & SSL:** Configure Nginx or Cloudflare with TLS 1.3 termination, HTTP/2 or HTTP/3, and standard security headers (`Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`).
3. **Backup Strategy:** Nightly automated `pg_dump` snapshots to an offsite S3-compatible bucket.

