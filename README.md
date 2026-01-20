# Kantan Care - AI Healthcare Assistant

Service Design & Deployment Capstone Project

## Quick Start
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Access Points

- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin)

## Tech Stack

- Backend: FastAPI + PostgreSQL + Redis
- AI: Bio_ClinicalBERT (Hugging Face)
- Monitoring: Prometheus + Grafana
- Containerization: Docker