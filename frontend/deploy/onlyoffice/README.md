# OnlyOffice Production Deployment

This folder provides a ready deployment bundle for:
- `api.<your-domain>` -> MURRS backend
- `docs.<your-domain>` -> OnlyOffice Docs

## 1) Prerequisites

- VPS/VM with Docker + Docker Compose
- DNS records:
  - `api.example.com` -> server IP
  - `docs.example.com` -> server IP
- Backend already running on `127.0.0.1:8001` (or adjust nginx `proxy_pass`)

## 2) Prepare files

1. Copy this folder to your server.
2. Edit nginx files:
   - `nginx/conf.d/api.conf`: replace `api.example.com`
   - `nginx/conf.d/docs.conf`: replace `docs.example.com`
3. If backend runs on a different host/port, update:
   - `nginx/conf.d/api.conf` -> `proxy_pass http://127.0.0.1:8001;`

## 3) Start stack (HTTP first)

```bash
docker compose up -d onlyoffice nginx
```

## 4) Obtain SSL certificates (Let's Encrypt)

Run once for each domain:

```bash
docker compose run --rm --profile certbot certbot \
  -c "certbot certonly --webroot -w /var/www/certbot -d api.example.com --email you@example.com --agree-tos --no-eff-email"
```

```bash
docker compose run --rm --profile certbot certbot \
  -c "certbot certonly --webroot -w /var/www/certbot -d docs.example.com --email you@example.com --agree-tos --no-eff-email"
```

Reload nginx:

```bash
docker compose restart nginx
```

Enable periodic renewal service:

```bash
docker compose --profile certbot up -d certbot
```

## 5) Wire app environment

Set in `backend/.env`:

```env
ONLYOFFICE_DOC_SERVER_URL=https://docs.example.com
PUBLIC_API_BASE_URL=https://api.example.com
```

Restart backend after changes.

## 6) Validation checklist

1. `https://docs.example.com` loads OnlyOffice welcome page.
2. `https://api.example.com/api/health` responds.
3. In MURRS reviewer dialog, open a `.docx` and click `Edit in App`.
4. Save in editor and confirm callback updates the file.

## Notes

- If your backend is in another container/network, ensure `api.example.com` is reachable from OnlyOffice.
- Keep ports `80/443` open in firewall/security groups.
- `api.conf` and `docs.conf` are plain templates; replace domain names before production.
