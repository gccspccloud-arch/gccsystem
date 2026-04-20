# Deploying GCC Attendance to Render (Free Tier)

This repo ships a `render.yaml` blueprint that creates **two services** from one repo:

| Service   | Type        | Root dir | URL pattern                       |
|-----------|-------------|----------|-----------------------------------|
| `gcc-api` | Web (Node)  | `server` | `https://gcc-api.onrender.com`    |
| `gcc-web` | Static site | `client` | `https://gcc-web.onrender.com`    |

Names can be changed in `render.yaml` before first deploy.

---

## 1. Pre-flight

- Push this repo to GitHub (Render reads from a connected repo).
- Have a **MongoDB Atlas** cluster ready and grab its connection string.
- In Atlas → Network Access, allow `0.0.0.0/0` (Render free tier doesn't have static outbound IPs).
- Generate a long random `JWT_SECRET` (e.g. `openssl rand -hex 48`).

## 2. Create the Blueprint

1. Render dashboard → **New +** → **Blueprint**.
2. Connect this GitHub repo.
3. Render reads `render.yaml` and proposes both services. Confirm.
4. When prompted for the **secret** env vars on `gcc-api`, paste:
   - `MONGODB_URI`
   - `JWT_SECRET`
5. Click **Apply**. Both services start building.

`CLIENT_URL` (on the API) and `VITE_API_BASE_URL` (on the web) are wired automatically from each other's hostnames via `fromService` in the blueprint.

> **Note on `VITE_API_BASE_URL`:** Render injects the hostname (e.g. `gcc-api.onrender.com`). The client expects a full URL ending in `/api`. After the first deploy, edit the `gcc-web` env var in the dashboard to: `https://gcc-api.onrender.com/api` and trigger a redeploy. (Vite bakes env vars at build time — they cannot be changed at runtime.)

## 3. Seed the super admin

Once `gcc-api` is live, open its **Shell** tab in Render and run:

```bash
npm run seed:admin
npm run seed:meeting-types
npm run seed:event-types
```

## 4. Free-tier caveats

- **Cold starts:** the API sleeps after ~15 minutes of inactivity. First request after sleep takes 30–50s. A simple cron-pinger (e.g. cron-job.org hitting `/healthz` every 10 min) keeps it warm if you can't tolerate that.
- **Static site is always-on** — no cold start for the UI itself.
- **Bandwidth:** 100 GB/month on the static site is plenty for a church-sized user base.
- **Build minutes:** 500/month — each push triggers a build of the changed service only.

## 5. Custom domain (optional)

Both services support custom domains under Settings → Custom Domains. Render handles the SSL cert via Let's Encrypt automatically. After adding the web custom domain, update `CLIENT_URL` on the API to include it (comma-separated):

```
CLIENT_URL=https://gcc-web.onrender.com,https://attendance.gcc.ph
```

## 6. Local production build (smoke test)

```bash
# server
cd server
NODE_ENV=production npm start

# client (in another shell)
cd client
cp .env.production.example .env.production   # edit to point at your API
npm run build && npm run preview
```
