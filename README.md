# Notion to R2 Worker

A Cloudflare Worker that automatically fetches data from a Notion database and stores it in Cloudflare R2 storage, making your Notion content available to your web applications.

## Overview

This worker fetches content from a specified Notion database on a regular schedule and stores it as a JSON file in Cloudflare R2 storage. This enables you to use your Notion database as a headless CMS for blogs or other content-driven websites.

### Key Features

- **Automated Content Sync**: Scheduled daily execution to keep your content fresh
- **Simple API Endpoints**: Access your Notion data through HTTP requests
- **Secure Configuration**: Uses Cloudflare Workers Secrets for API keys
- **Comprehensive Logging**: Detailed logs available in the Cloudflare dashboard
- **Built-in Monitoring**: Observability features for tracking worker execution

## Setup Instructions

### Prerequisites

- A Cloudflare account with Workers and R2 enabled
- A Notion database and API key
- Node.js and npm installed locally
- Wrangler CLI (version 3.78.6 or higher)

### Installation

1. Clone this repository:

   ```bash
   git clone <repository-url>
   cd notion-to-r2-worker
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure your worker:

   ```bash
   # Create R2 bucket if not already created
   npx wrangler r2 bucket create blog-data

   # Set your Notion API key as a secret
   npx wrangler secret put NOTION_API_KEY

   # Set your Notion Database ID as a secret
   npx wrangler secret put NOTION_DATABASE_ID
   ```

4. Deploy the worker:

   ```bash
   npx wrangler deploy
   ```

## Configuration

### Notion API Setup

1. Create an integration at [Notion Developers](https://www.notion.so/my-integrations)
2. Copy the "Internal Integration Token" to use as your `NOTION_API_KEY`
3. Share your Notion database with the integration
4. Copy the database ID from your database URL:
   - URL format: `https://www.notion.so/{workspace_name}/{database_id}?v={view_id}`
   - The database ID is the part between the workspace name and the view ID

### Worker Configuration (wrangler.toml)

The `wrangler.toml` file contains the following configuration:

```toml
name = "notion-to-r2-worker"
main = "worker.js"
compatibility_date = "2025-03-05"
nodejs_compat = true

# Trigger the worker on a schedule (every day at 5:00 AM UTC)
[triggers]
crons = ["0 5 * * *"]

# R2 bucket binding
[[r2_buckets]]
binding = "MY_BUCKET"
bucket_name = "blog-data"

# Logging configuration
[observability]
enabled = true
head_sampling_rate = 1
```

## API Endpoints

The worker exposes the following HTTP endpoints:

### GET /{filename}

Retrieve a file from R2 storage.

Example:

```bash
curl -X GET https://notion-to-r2-worker.example.workers.dev/blog-data.json
```

### POST /run-test

Manually trigger the Notion-to-R2 process.

Example:

```bash
curl -X POST https://notion-to-r2-worker.example.workers.dev/run-test
```

### GET /check-config

Check if the worker is properly configured.

Example:

```bash
curl -X GET https://notion-to-r2-worker.example.workers.dev/check-config
```

### GET /list-bucket

List the contents of the R2 bucket.

Example:

```bash
curl -X GET https://notion-to-r2-worker.example.workers.dev/list-bucket
```

### PUT /{filename}

Upload a file to R2 storage.

Example:

```bash
curl -X PUT https://notion-to-r2-worker.example.workers.dev/test.json --data '{"test":"data"}' -H "Content-Type: application/json"
```

## Scheduled Execution

The worker is configured to run automatically once per day at 5:00 AM UTC. You can modify this schedule by changing the cron pattern in the `wrangler.toml` file.

## Logging and Monitoring

The worker uses Cloudflare Workers Logs for observability. You can view logs in the Cloudflare dashboard:

1. Go to the Cloudflare dashboard
2. Navigate to Workers & Pages
3. Select your worker
4. Click on the "Logs" tab

## Troubleshooting

### Common Issues

1. **"Invalid request URL" error**:

   - Check if your `NOTION_API_KEY` and `NOTION_DATABASE_ID` secrets are properly set
   - Verify that your integration has access to the database

2. **"Object Not Found" when requesting blog-data.json**:

   - Manually trigger the worker using the `/run-test` endpoint
   - Check the worker logs for errors

3. **"Worker execution timeout"**:
   - The Notion database might be too large; consider filtering the data

### Verifying Your Setup

Use the following steps to verify your worker is functioning correctly:

1. Check your configuration:

   ```bash
   curl -X GET https://notion-to-r2-worker.example.workers.dev/check-config
   ```

2. Trigger the Notion-to-R2 process:

   ```bash
   curl -X POST https://notion-to-r2-worker.example.workers.dev/run-test
   ```

3. Verify the file was created:

   ```bash
   curl -X GET https://notion-to-r2-worker.example.workers.dev/list-bucket
   ```

4. Retrieve the file:

   ```bash
   curl -X GET https://notion-to-r2-worker.example.workers.dev/blog-data.json
   ```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
