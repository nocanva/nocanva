# NoCanva operations

## Initialization, migrations, and seed data

Schema migrations are idempotent and run when the workspace first accesses persistence. Canonical SQL migrations live in `drizzle/`. The initial NoCanva brand and statement/signal templates are inserted with stable IDs. Verify initialization with:

```bash
npm run seed
curl http://localhost:3000/api/health
```

## Health and diagnostics

- `GET /api/health` checks the application, database, and object storage.
- `GET http://localhost:3100/healthz` checks the MCP sidecar and its application dependency.
- `GET http://localhost:3100/diagnostics` requires the bearer token and reports the token/workspace identity, transport, application URL, and dependency status without returning secrets.

## Backup

The backup contains both SQLite records and filesystem object data from the local runtime state.

```bash
docker compose --env-file .env.self-host exec web npm run backup
```

Archives and SHA-256 sidecars appear in `backups/` on the host.

## Restore

Stop both services before restoring. The restore command saves current state to a timestamped recovery archive before replacing the mounted state contents with the selected archive.

```bash
docker compose --env-file .env.self-host stop web mcp
docker compose --env-file .env.self-host run --rm web npm run restore -- /app/backups/nocanva-TIMESTAMP.tar.gz
docker compose --env-file .env.self-host up -d
```

## Upgrade

1. Create and verify a backup.
2. Pull the desired tagged release.
3. Run `docker compose --env-file .env.self-host build`.
4. Run `docker compose --env-file .env.self-host up -d`.
5. Check `/api/health`, `/healthz`, and the MCP connection page.
6. Run the HTTP MCP smoke fixture before deleting the pre-restore recovery state.

Never skip directly across a release whose notes require a manual migration. Immutable renders and draft revisions must remain addressable after every upgrade.
