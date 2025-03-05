# Notion to R2 Worker

A lightweight tool that retrieves a database from Notion, transforms it into a JSON file, and uploads it to Cloudflare R2 storage, running on a Cloudflare Worker.

## Features

- Fetches data from a Notion database
- Converts Notion pages to Markdown
- Structures the data into a JSON format suitable for a blog
- Uploads the data to Cloudflare R2 storage
- Runs on Cloudflare Workers
- Scheduled execution
- Manual trigger endpoint with basic auth
- Direct PUT endpoint for R2 storage

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v16.13.0 or higher)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- Cloudflare account with Workers and R2 enabled
- Notion API key and database

### Installation

1. Clone this repository:

   ```
   git clone <repository-url>
   cd notion-to-r2
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Set up your Cloudflare account with Wrangler:

   ```
   npx wrangler login
   ```

4. Create an R2 bucket named "blog-data" in your Cloudflare dashboard or using Wrangler:

   ```
   npx wrangler r2 bucket create blog-data
   ```

5. Add your secrets to Wrangler:
   ```
   npx wrangler secret put NOTION_API_KEY
   npx wrangler secret put NOTION_DATABASE_ID
   npx wrangler secret put ADMIN_KEY
   ```

### Configuration

- Edit `wrangler.toml` to configure your worker settings
- Adjust the CRON schedule if needed

## Usage

### Development

```
npm run dev
```

This will start a local development server.

### Deployment

```
npm run deploy
```

This will deploy your worker to Cloudflare.

### Triggering the Worker

The worker can be triggered in three ways:

1. **Automatically via schedule**: The worker runs according to the cron schedule in `wrangler.toml`

2. **Manually via API**: Send a POST request to the `/sync` endpoint with the admin key:

   ```
   curl -X POST https://your-worker.your-subdomain.workers.dev/sync -H "X-Admin-Key: your-admin-key"
   ```

3. **Direct PUT**: Upload any file directly to R2:
   ```
   curl -X PUT https://your-worker.your-subdomain.workers.dev/path-to-file --data-binary @localfile.json
   ```

## Project Structure

- `worker.js`: Main worker code that handles requests and scheduled triggers
- `wrangler.toml`: Configuration file for Cloudflare Workers
- `package.json`: Node.js dependencies and scripts
- `notion-to-r2.js`: Original Node.js implementation (kept for reference)

## License

MIT
