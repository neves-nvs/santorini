# Hosting options

Where Santorini could run for free, with a staging copy for every pull request and a production deploy on merge. Checked in November 2026 against each provider's own documentation. Free tiers change often, so check the linked pages before relying on a number. Where a page did not say something, this document says "not stated" instead of guessing.

## What the app needs

- **Long-lived WebSocket connections.** Games are played over `/ws`. Connected clients are tracked inside the server process, so there must be exactly one server instance.
- **PostgreSQL.** Migrations run from the server image before it starts.
- **Docker images.** CI already builds two: the server, and the nginx frontend that serves the client and proxies `/api` and `/ws` to the server. `docker-compose.yml` runs them with Postgres.
- **One origin.** The browser talks only to the frontend, which proxies to the server. That keeps cookies first-party and CORS out of the picture. Hosting the frontend somewhere else gives it a different origin, and then the CORS allowlist and the cookie flags have to cover it.
- **No sleeping, ideally.** A sleeping service drops its WebSocket connections.

Most options below need the images in a registry first (roadmap item S2-4, publishing to ghcr.io).

## Vercel

Vercel Functions now serve WebSocket connections, in public beta on all plans since June 22, 2026 ([Vercel guide](https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections)). It still does not fit the server:

- Every connection closes when the function reaches its maximum duration: 300 seconds on Hobby, up to 800 seconds on Pro (1,800 in beta).
- Rooms and presence must live in an external store, because instances do not share memory. Ours live in the process.
- The endpoint has to be a Vercel Function. Our Express and `ws` server would need a rewrite.

Vercel, like Netlify and Cloudflare Pages, is fine for a static frontend with per-PR previews. The catch is the origin: those hosts proxy only certain paths, and none of the pages I read say they proxy WebSocket upgrades (Cloudflare Pages proxies only relative URLs, not external domains).

## Options that can run the server

| Option | Free | WebSockets | Postgres | Per-PR environments | Main catch |
| --- | --- | --- | --- | --- | --- |
| [Northflank](https://northflank.com/pricing) | Sandbox: no card, up to $20/mo of resources, 2 services, 2 jobs, 1 database, always on | Not stated | 1 database in the sandbox | Preview blueprints exist; not stated for the sandbox | Free duration not stated |
| [Fly.io](https://docs.fly.io/about/pricing) | No free tier; a monthly bill under $5 is waived | Not stated on the pages read | Managed Postgres starts at $38/mo | Official GitHub Actions guide | Card required; each app costs money until the waiver |
| [Render](https://render.com/docs/free) | 750 free hours a month, one 512 MB service | Yes, no duration limit | Free Postgres expires after 30 days | Single service only on free | Sleeps after 15 minutes idle |
| [Koyeb](https://www.koyeb.com/docs/faqs/pricing) | One free service | Not stated | 5 hours of compute a month | None found | Card required, one service only |
| [Railway](https://railway.com/pricing) | $5 trial credit for 30 days, then $1/month | Not stated | Not stated | Yes | Not free after the trial |
| [Google Cloud Run](https://docs.cloud.google.com/run/docs/triggering/websockets) | Free tier exists; numbers not read | Yes, up to 60 minutes per connection | Not included | Tagged revisions | Billing account; reconnects needed |
| [Azure Container Apps](https://azure.microsoft.com/en-us/pricing/details/container-apps/) | Monthly grant of 180,000 vCPU-seconds, 360,000 GiB-seconds, 2M requests | Yes | Not included | Not documented | HTTP ingress times out at 240 seconds |
| [Oracle Always Free](https://docs.oracle.com/iaas/Content/FreeTier/resourceref.htm) | 2 OCPU and 12 GB ARM total, plus two 1 GB AMD VMs | Yours to run | Yours to run | Do it yourself | Idle VMs can be reclaimed |

### Notes per option

**Northflank.** The free Sandbox is the only plan I found that is free without a card and always on. Two services fit the server and the frontend, and the one database fits Postgres. Preview environments are defined by a preview blueprint tied to a Git source ([docs](https://northflank.com/docs/v1/application/use-cases/create-preview-environments)). Not stated on the pages I read: WebSockets, whether previews work on the Sandbox, how long it stays free, and what happens past the allowance. Most worth checking first.

**Fly.io.** New accounts get a $1 credit for 7 days, with no card ([trial](https://docs.fly.io/about/free-trial)). After that you need a card, but a monthly bill under $5 is waived, so one small machine can run for free. Per-PR apps come from [an official GitHub Actions guide](https://docs.fly.io/blueprints/review-apps-guide), which names each app `pr-<number>-<owner>-<repo>.fly.dev`. Each PR app runs its own machines, so previews count toward that $5. Use an external free database, not Fly's.

**Render.** A free web service accepts WebSocket connections with no duration cap, and a new connection wakes a sleeping service ([WebSockets](https://render.com/docs/websocket), [free tier](https://render.com/docs/free)). It spins down after 15 minutes without traffic and takes about a minute to wake. The free Postgres is 1 GB, expires after 30 days, and is deleted after a 14-day grace period, so use an external database. Multi-service preview environments need a Pro workspace ([docs](https://render.com/docs/preview-environments)). Single-service PR previews work on free, but we would have two services unless the server also served the client.

**Koyeb.** One free service, Frankfurt or Washington, 512 MB, scaling to zero after an hour. A card is required, and the FAQ describes a $29 hold. I found no preview environments, and the free database is capped at 5 hours of compute a month.

**Railway.** PR environments exist and are deleted when the PR closes ([docs](https://docs.railway.com/guides/environments)). The free offer is a 30-day trial and then $1 a month of credit, which does not cover an always-on app.

**Google Cloud Run.** WebSockets work with no extra configuration, but a connection counts against the request timeout, which is 5 minutes by default and at most 60 minutes. An instance with any open connection is billed as active. Previews come from `gcloud run deploy --no-traffic --tag pr-123` ([docs](https://docs.cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration)), which gives the same service a second URL. All revisions share one database. The official pricing page did not load, so I could not confirm the free tier numbers or the billing requirements.

**Azure Container Apps.** The free grant is the one in the table. Always-on use of even a small container would likely exceed it, but I did not calculate that. Revision labels give a unique URL per revision ([docs](https://learn.microsoft.com/azure/container-apps/revisions)), and per-PR automation is not documented.

**Oracle Always Free.** A real VM that runs `docker-compose.yml` as it is, with no sleeping. Oracle's page now says the Ampere allowance is 2 OCPUs and 12 GB; news reports say it was larger before June 2026. Idle instances may be reclaimed, and creation can fail with "out of host capacity". Per-PR environments would be a GitHub Actions job over SSH that starts a compose project per PR on its own port or hostname behind a proxy, and that is the most work of any option.

## Databases

A free external Postgres is the usual answer, because platform databases are small or expire.

| Option | Free plan | Per-PR databases |
| --- | --- | --- |
| [Neon](https://neon.com/faqs/free-plan-limits-and-quotas) | 1 GB per project, 100 compute-hours a month, scales to zero after 5 minutes | Official [GitHub Actions workflow](https://neon.com/docs/guides/branching-github-actions) creates a branch per PR and deletes it on close. Free allows 10 branches per project including the root, and no extras |
| [Supabase](https://supabase.com/pricing) | 500 MB, two projects, paused after a week of inactivity | Branching is not on the free plan |

The first request after Neon scales to zero is slower, and `/readyz` will report it when the database is waking.

## How the workflow would look

Whichever host, the pipeline has the same shape:

1. **Pull request opened or updated:** build the images with the existing Bake workflow, push them to the registry, create the PR's database branch, deploy a staging copy, and comment its URL on the PR.
2. **Pull request closed:** delete the staging copy and the database branch.
3. **Merge to `main`:** deploy production with the same images and run migrations.

GitHub Environments can hold the staging and production secrets separately, and can require an approval before production.

Two things in our app interact with per-PR staging:

- **CORS and WebSocket origins.** `ALLOWED_ORIGINS` is a fixed list, and a per-PR URL is new every time. Same-origin hosting (frontend and server behind one hostname) avoids this. A separate frontend on a static host would need the origin added for each PR.
- **Migrations.** Each PR's database branch starts from production's schema and must run the PR's migrations before the server starts, as the compose `migrate` service does.

## Summary

None of these gives free, always-on, WebSockets, Postgres, per-PR staging and one origin together.

- **Closest on paper:** Northflank's Sandbox, which has exactly two free services and one database, always on, with no card. WebSockets and sandbox previews still need checking.
- **Free if usage stays small:** Fly.io, with an official PR workflow, a card, and an external Neon database.
- **Free but sleeps:** Render. Games would drop connections after 15 minutes of no traffic.
- **Most control:** an Oracle VM, or the homelab already planned in the roadmap, running the compose file with a self-made preview script.

Not verified: WebSocket behaviour on Northflank, Fly.io, Railway and Koyeb pages, Cloud Run's free-tier numbers and card requirement, Render's pricing table, and Northflank's free duration. Verify these before choosing.
