# biztrendlab-cron

Standalone extraction of the BizTrendLab cron scraping pipeline.

## What was copied
- scripts: scripts/cron-scraper.ts, scripts/init-providers.ts
- cron core: lib/cron/**
- provider quota: lib/redis/**
- AI/embedding: lib/services/{embedding,clustering,deepseek}.ts
- data schema: lib/db/trend/schema.ts, lib/types/topics.ts
- migrations: drizzle/** and drizzle.config.ts
- env reference: doc/ENV_VARIABLES.md (for cron-related variables)

## Quick start
```bash
cd biztrendlab-cron
npm install
cp .env.example .env
npx tsx scripts/init-providers.ts status   # check Redis + providers
npx tsx scripts/cron-scraper.ts --list     # verify platforms
```

## Running
- All platforms: `npm run cron`
- Specific sources: `npx tsx scripts/cron-scraper.ts --source=reddit,github`
- Provider setup: `npm run providers:init` (uses TWITTER_RAPIDAPI_KEYS)
- Drizzle push: `npm run db:push` (needs DATABASE_URL)

## Notes
- Ensure DATABASE_URL points to the same database as the main app if you want shared data.
- Redis (Upstash) is required for Twitter provider quota management.
- Embedding and DeepSeek APIs must be reachable from the environment where the cron runs.
