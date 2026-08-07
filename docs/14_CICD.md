# CI/CD

Two environments, one workflow: `.github/workflows/deploy.yml`.

- Push to `main` → build, typecheck, test, then deploy to **staging**.
- Manual run (`workflow_dispatch`) → pick `staging` or `production`.
- **Rollback**: run the workflow manually and set `ref` to a previous release
  tag or commit SHA. Every production deploy tags itself `release-<date>-<sha>`.

## Required GitHub configuration

Set these per environment (Settings → Environments → staging / production).

Secrets:
| Name | Purpose |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI auth |
| `SUPABASE_PROJECT_REF` | Target backend project |
| `SUPABASE_DB_PASSWORD` | Needed by `supabase db push` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend anon key |
| `SLACK_WEBHOOK_URL` | Failure alerts |

Variables:
| Name | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID` | Frontend backend target |
| `HLS_BASE_URL` | Public HLS origin of the ingest server |
| `APP_URL` | Public site URL used in alert links |

Because secrets are environment-scoped, staging and production never share
credentials, and the same commit can be deployed to either one unchanged.
