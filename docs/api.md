# Notion to R2 Worker API Documentation

This document describes the API endpoints exposed by the Notion to R2 Worker.

## Base URL

All API requests should be made to:

```text
https://notion-to-r2-worker.tonglam.workers.dev
```

Replace with your actual worker URL.

## Authentication

The worker uses the following authentication methods:

- **Cloudflare Workers Secrets** for securing API keys
- No authentication is required for public endpoints (GET requests)

## Endpoints

### Retrieve File

Retrieves a file from R2 storage.

#### Retrieve File Request

```text
GET /{filename}
```

#### Retrieve File Parameters

- `filename` (string, required): The name of the file to retrieve from R2

#### Retrieve File Response

- `200 OK`: The file content
- `404 Not Found`: File does not exist
- `500 Internal Server Error`: Error retrieving the file

#### Retrieve File Example

```bash
curl -X GET https://notion-to-r2-worker.tonglam.workers.dev/blog-data.json
```

### Manual Trigger

Manually triggers the Notion-to-R2 process.

#### Manual Trigger Request

```text
POST /run-test
```

#### Manual Trigger Response

```json
{
  "message": "Notion-to-R2 process triggered manually",
  "status": "running in background",
  "triggerTime": "2025-03-05T16:43:30.335Z"
}
```

#### Manual Trigger Example

```bash
curl -X POST https://notion-to-r2-worker.tonglam.workers.dev/run-test
```

### Check Configuration

Checks if the worker is properly configured.

#### Check Configuration Request

```text
GET /check-config
```

#### Check Configuration Response

```json
{
  "NOTION_API_KEY": "Set",
  "NOTION_DATABASE_ID": "Set",
  "R2_BUCKET": "Connected",
  "timestamp": "2025-03-05T16:28:19.709Z"
}
```

#### Check Configuration Example

```bash
curl -X GET https://notion-to-r2-worker.tonglam.workers.dev/check-config
```

### List Bucket

Lists the contents of the R2 bucket.

#### List Bucket Request

```text
GET /list-bucket
```

#### List Bucket Parameters

- `prefix` (string, optional): Filter files by prefix

#### List Bucket Response

```json
{
  "files": [
    {
      "name": "blog-data.json",
      "size": 571073,
      "uploaded": "2025-03-05T16:43:32.508Z"
    }
  ],
  "count": 1,
  "truncated": false
}
```

#### List Bucket Example

```bash
curl -X GET https://notion-to-r2-worker.tonglam.workers.dev/list-bucket
```

### Upload File

Uploads a file to R2 storage.

#### Upload File Request

```text
PUT /{filename}
```

#### Upload File Parameters

- `filename` (string, required): The name to give the file in R2

#### Upload File Headers

- `Content-Type` (string, optional): The MIME type of the file

#### Upload File Request Body

The file content to upload

#### Upload File Response

- `200 OK`: File uploaded successfully
- `500 Internal Server Error`: Error uploading the file

#### Upload File Example

```bash
curl -X PUT https://notion-to-r2-worker.tonglam.workers.dev/test.json \
  --data '{"test":"data"}' \
  -H "Content-Type: application/json"
```

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200`: Success
- `404`: Not Found
- `405`: Method Not Allowed
- `500`: Internal Server Error

Error responses include a message describing the error.
