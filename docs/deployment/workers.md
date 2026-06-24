# Deployment on Cloudflare Workers

Sink deploys as a Nuxt app on Cloudflare Workers. D1 is the primary database and KV is only the redirect cache.

## Prerequisites

- Node.js 22 or later.
- pnpm 10.28.2. Use `corepack enable` if pnpm is not available.
- A Cloudflare account with Wrangler logged in: `pnpm wrangler login`.
- A Google OAuth Web Client for the school login flow.

Install dependencies first:

```bash
pnpm install
```

`pnpm install` runs `postinstall`, which prepares Nuxt-generated files required by linting and builds.

## Create Cloudflare resources

Run these from the repository root.

### D1 database

Create the production D1 database:

```bash
pnpm wrangler d1 create sink
```

Copy the returned `database_id` into `wrangler.jsonc`:

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "sink",
      "database_id": "<your-d1-database-id>",
      "migrations_dir": "migrations"
    }
  ]
}
```

Apply the schema migrations to the remote database:

```bash
pnpm wrangler d1 migrations apply sink --remote
```

### KV redirect cache

Create the KV namespace used by the redirect cache:

```bash
pnpm wrangler kv namespace create KV
```

Copy the returned `id` into `wrangler.jsonc` under `kv_namespaces[0].id`. For local preview isolation, create another namespace and put its ID in `preview_id`.

### Analytics Engine and Workers AI

`wrangler.jsonc` already defines:

```jsonc
{
  "analytics_engine_datasets": [
    {
      "binding": "ANALYTICS",
      "dataset": "sink"
    }
  ],
  "ai": {
    "binding": "AI",
    "remote": true
  }
}
```

Workers Analytics Engine creates the dataset automatically after the Worker writes data to the configured binding. Keep the dataset name as `sink` unless you also change `NUXT_DATASET`.

## Configure secrets and runtime variables

Use Wrangler secrets for sensitive values:

```bash
pnpm wrangler secret put NUXT_SITE_TOKEN
pnpm wrangler secret put NUXT_GOOGLE_OAUTH_CLIENT_ID
pnpm wrangler secret put NUXT_GOOGLE_OAUTH_CLIENT_SECRET
pnpm wrangler secret put NUXT_CF_ACCOUNT_ID
pnpm wrangler secret put NUXT_CF_API_TOKEN
```

Required values:

- `NUXT_SITE_TOKEN`: at least 8 characters. This is the system admin token.
- `NUXT_GOOGLE_OAUTH_CLIENT_ID`: Google OAuth Web Client ID.
- `NUXT_GOOGLE_OAUTH_CLIENT_SECRET`: Google OAuth Web Client secret.
- `NUXT_CF_ACCOUNT_ID`: Cloudflare account ID for Analytics Engine queries.
- `NUXT_CF_API_TOKEN`: Cloudflare API token with Account Analytics Read access.

Optional values:

- `NUXT_GOOGLE_OAUTH_REDIRECT_URL`: set this only if the automatic callback URL is wrong. The value should be `https://<your-domain>/api/auth/google/callback`.
- `NUXT_GOOGLE_OAUTH_HOSTED_DOMAIN`: defaults to `student.clhs.tyc.edu.tw`.
- `NUXT_DAILY_CREATE_LIMIT`: defaults to `20`.
- `NUXT_DATASET`: defaults to `sink`.

In Google Cloud Console, configure the OAuth Web Client with this authorized redirect URI:

```text
https://<your-domain>/api/auth/google/callback
```

## Build and deploy

Build the app:

```bash
pnpm build
```

Deploy the Worker and static assets:

```bash
pnpm deploy:worker
```

For a local Worker preview:

```bash
pnpm build
pnpm preview
```

## Upgrade from the old KV-primary deployment

Deploy the new Worker only after D1, KV, Analytics Engine, and secrets are configured.

Then migrate legacy JSON link records from KV into D1 in batches:

```bash
curl -X POST "https://<your-domain>/api/admin/kv-migrate" \
  -H "Authorization: Bearer <NUXT_SITE_TOKEN>" \
  -H "Content-Type: application/json" \
  --data "{\"prefix\":\"\",\"limit\":100}"
```

If the response includes a `cursor`, run the same request again with that cursor:

```bash
curl -X POST "https://<your-domain>/api/admin/kv-migrate" \
  -H "Authorization: Bearer <NUXT_SITE_TOKEN>" \
  -H "Content-Type: application/json" \
  --data "{\"prefix\":\"\",\"limit\":100,\"cursor\":\"<cursor>\"}"
```

Repeat until `list_complete` is `true`. The migration skips invalid records and existing D1 slugs, and refreshes the `link:{slug}` KV redirect cache for migrated links.

## Post-deploy checks

1. Open `/dashboard/login`.
2. Sign in with a `@student.clhs.tyc.edu.tw` Google account.
3. Sign in with `NUXT_SITE_TOKEN` and confirm the admin dashboard works.
4. Create a short link, open it, and confirm the redirect works.
5. Confirm `/api/link/list?order=desc` only shows the signed-in student's links unless you are using the admin token.
6. Submit a report through `/api/link/report` and review it as admin.

## Updating later

Pull the latest code, install dependencies, apply any new D1 migrations, then rebuild and redeploy:

```bash
pnpm install
pnpm wrangler d1 migrations apply sink --remote
pnpm build
pnpm deploy:worker
```

## Optional R2 features

Image uploads and manual R2 backups are disabled when `R2` is not bound. To enable them later, create a bucket and uncomment the `r2_buckets` block in `wrangler.jsonc`:

```bash
pnpm wrangler r2 bucket create sink
```
