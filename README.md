# Splitwiz

Shared expenses for two people, self-hosted on a Synology NAS and used from Android phones as an installable web app.

- **Add an expense** in a few taps: amount, what it was for, who paid, how to split (50/50, percentage, exact amount, or "the other person owes all").
- **One balance** on the home screen: who owes whom, and how much.
- **Settle up** with one tap, full or partial.
- **History** by month with search, edit and delete.
- **Repeating expenses** (weekly, monthly, yearly): added automatically on their day, and caught up if the NAS was asleep. Pause, edit or stop them under Settings. Any existing expense can be made repeating from its edit screen, and Settings suggests charges that already came back monthly (for example after an import).
- **Import from Splitwise**: pick a group's CSV export under Settings. Every expense and payment comes over with the same final balance, and importing the same file again adds only new rows.
- **Stats** for a chosen period (this month, last month, 3 or 12 months, this year, all time): total spent, who paid what, spending per month, by category with tap-to-drill-down, and the biggest expenses.
- **Live sync** between both phones, and **CSV export** of everything.

## How it is built

| Part | Choice |
| --- | --- |
| Backend | [PocketBase](https://pocketbase.io) used as a Go framework (`backend/`), SQLite database |
| Money logic | `backend/ledger`: integer cents, split, balance and repeat-date rules, unit tested |
| Splitwise import | `backend/splitwise`: parses the export, keeps each row's exact split |
| Web app | Svelte 5 + Vite + Tailwind (`web/`), installable PWA |
| Packaging | One Docker image (`Dockerfile`), published to `ghcr.io/kalfasyan/splitwiz` by GitHub Actions |

The server computes `owed_cents` for every expense itself, so the phones can never store an inconsistent split. Sign-ups are closed: the two accounts are created once in the admin page.

## Run it locally

```sh
# backend (needs Go 1.27+)
cd backend
go run . superuser upsert admin@example.com changeme123
go run . serve            # http://127.0.0.1:8090, admin at /_/

# web app with hot reload (needs Node 22+), in another terminal
cd web
npm install
npm run dev               # proxies /api to :8090
```

Tests: `cd backend && go test ./...` and `cd web && npm test && npm run check`.

## Install on the Synology DS220+

Every step that changes the NAS is done by you, in DSM.

1. **Container Manager**: install it from Package Center if it is missing. It usually creates the `docker` shared folder.
2. **Data folder**: in File Station, create `docker/splitwiz/pb_data`.
3. **Project**: Container Manager > Project > Create, name `splitwiz`, path `/volume1/docker/splitwiz`, and paste [`docker-compose.yml`](docker-compose.yml). Start it.
   - The image is private while the repository is private. Either make the package public on GitHub (Packages > splitwiz > Package settings > Change visibility), or add a registry login for `ghcr.io` in Container Manager > Registry with a GitHub token that has `read:packages`.
4. **Address and certificate**: Control Panel > External Access > DDNS > Add, provider Synology, hostname `<your-name>.synology.me`, with "Get a certificate from Let's Encrypt" ticked.
5. **Reverse proxy**: Control Panel > Login Portal > Advanced > Reverse Proxy > Create:
   - Source: HTTPS, hostname `<your-name>.synology.me`, port 443
   - Destination: HTTP, `localhost`, port 8090
6. **Certificate**: Control Panel > Security > Certificate > Settings, assign the `<your-name>.synology.me` certificate to that reverse-proxy entry.
7. **Router**: give the NAS a fixed address (DHCP reservation) in the router, then forward TCP 443 to it if it is not forwarded already.
8. **Accounts**: create the admin account over SSH, typing your own password:
   `sudo docker exec -it splitwiz /app/splitwiz superuser upsert you@example.com 'your-password' --dir=/app/pb_data`.
   Then sign in at `https://<your-name>.synology.me/_/`, open the `users` collection and add two records (email, password, name).

## Install on the phones

Open `https://<your-name>.synology.me` in Chrome, sign in, then tap **Install app** (or menu > Add to Home screen). Splitwiz now opens from its own icon.

## Updating

From a computer with Docker and SSH access to the NAS:

```sh
scripts/deploy-to-nas.sh you@your-nas-address
```

It builds the image locally, copies it over and recreates the container. Alternatively, every push to `main` publishes a new `latest` image. In Container Manager, pull the new image (Image > `ghcr.io/kalfasyan/splitwiz` > Update, when DSM shows it), then Project > splitwiz > Action > Build to recreate the container. The database stays in `pb_data` and migrations run on start. The exact DSM menu names will be confirmed during the first install.

## Backups

- PocketBase makes a backup every evening at 20:00 (NAS local time, set by `TZ` in `docker-compose.yml`) into `pb_data/backups` and keeps the last 7 (Settings > Backups in the admin page).
- Add `/volume1/docker/splitwiz` to a Hyper Backup task to keep a copy off the NAS.
- Settings > Export all data (CSV) in the app gives a human-readable copy.
