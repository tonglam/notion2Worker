# Notion Database Structure

This document describes the recommended structure for your Notion database to work optimally with the Notion to R2 Worker.

## Overview

The worker is designed to fetch content from a Notion database and store it as a JSON file in Cloudflare R2 storage. While the worker can adapt to various database structures, following these recommendations will ensure the best results.

## Basic Requirements

- The database must be accessible by your Notion integration
- The database should have a Title property (all Notion databases have this by default)

## Recommended Properties

For blogs and content websites, we recommend including the following properties in your Notion database:

| Property Name   | Type          | Description                          |
| --------------- | ------------- | ------------------------------------ |
| Title           | Title         | The title of your content            |
| Slug            | Text          | URL-friendly version of the title    |
| Published       | Checkbox      | Whether the content should be public |
| Date            | Date          | Publication date                     |
| Category        | Select        | Content category                     |
| Tags            | Multi-select  | Content tags                         |
| Summary         | Text          | Short description                    |
| Content         | Text          | Main content (rich text)             |
| Author          | Person        | Content author                       |
| Featured Image  | Files & Media | Main image                           |
| SEO Description | Text          | Description for SEO                  |

## Example Database Structure

Here's an example of a blog post database in Notion:

![Notion Database Example](https://example.com/notion-database-example.png)

## Database ID

To find your Notion database ID:

1. Open your database in Notion
2. Look at the URL in your browser:

   ```text
   https://www.notion.so/{workspace_name}/{database_id}?v={view_id}
   ```

3. The database ID is the part between the workspace name and the view ID (after the ? symbol)

## Integration Access

For the worker to access your database:

1. Go to your database in Notion
2. Click on the "..." menu in the top right
3. Select "Add connections"
4. Find and select your integration

## Data Transformation

The worker currently stores the raw Notion API response for maximum flexibility. If you need a specific data structure, you can modify the `fetchNotionDataToR2` function in the worker.js file to transform the data accordingly.

## Custom Formatting

To create custom formatting of your Notion data, you can:

1. Modify the worker.js code to format the data as needed
2. Use the raw Notion API response and transform it in your frontend application
3. Create a separate worker to transform the data between R2 and your frontend

## Example: Formatting Blog Posts

If you want to format your Notion database specifically for a blog, you can use this structure for your transformed data:

```json
{
  "posts": [
    {
      "id": "page-id",
      "title": "Blog Post Title",
      "slug": "blog-post-title",
      "publishedDate": "2025-03-05",
      "category": "Technology",
      "tags": ["JavaScript", "Cloudflare"],
      "summary": "A short summary of the post",
      "content": "# Markdown Content\n\nHere is the full content...",
      "author": "Jane Doe",
      "featuredImage": "https://example.com/image.jpg"
    }
  ],
  "categories": ["Technology", "Tutorials", "News"],
  "tags": ["JavaScript", "Cloudflare", "Notion", "API"],
  "totalPosts": 1,
  "lastUpdated": "2025-03-05T16:43:32.508Z"
}
```

This structure is more suitable for consumption by frontend applications.
