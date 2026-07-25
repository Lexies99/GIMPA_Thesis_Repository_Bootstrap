## Backend (FastAPI + Postgres)

This backend uses FastAPI, SQLAlchemy, and JWT auth.

### Quick start

1. Create a virtual environment and install deps:

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

2. Set environment variables (copy and edit):

```bash
copy .env.example .env
```

Optional SMTP variables for email notifications:

- `SMTP_ENABLED=true`
- `SMTP_HOST=smtp.example.com`
- `SMTP_PORT=587`
- `SMTP_USERNAME=your_username`
- `SMTP_PASSWORD=your_password`
- `SMTP_USE_TLS=true`
- `SMTP_USE_SSL=false`
- `SMTP_FROM_EMAIL=no-reply@example.com`
- `SMTP_FROM_NAME=MURRS`
- `SMTP_TIMEOUT_SECONDS=10`

3. Create tables:

```bash
python -m app.db.init_db
```

4. Run the API:

```bash
uvicorn app.main:app --reload
```

### Endpoints

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/me` (auth required)
- `GET /api/users` (auth required)
- `GET /api/users/{user_id}` (auth required)
- `PATCH /api/users/{user_id}` (auth required)
- `DELETE /api/users/{user_id}` (auth required)
- `PATCH /api/users/{user_id}/role` (admin required)

### Alembic (migrations)

Generate a new migration:

```bash
alembic revision --autogenerate -m "init"
```

Apply migrations:

```bash
alembic upgrade head
```
