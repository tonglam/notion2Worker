// worker.js
import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";

/**
 * Cloudflare Worker for Notion to R2 integration
 * The worker fetches data from Notion and stores it in R2
 */
export default {
  // Scheduled trigger (runs automatically according to cron pattern)
  async scheduled(event, env, ctx) {
    console.log("[INFO] Scheduled event triggered");
    try {
      ctx.waitUntil(fetchNotionDataToR2(env));
    } catch (error) {
      console.error(`[ERROR] Scheduled event failed: ${error.message}`);
    }
  },

  // HTTP request handler (for API usage)
  async fetch(request, env, ctx) {
    console.log(
      `[REQUEST] Handling ${request.method} request to ${request.url}`
    );
    const url = new URL(request.url);
    const path = url.pathname.slice(1);

    // Add an endpoint to check configuration
    if (request.method === "GET" && path === "check-config") {
      console.log(`[CONFIG CHECK] Verifying configuration`);
      try {
        // Safely check configuration (don't expose actual values)
        const configStatus = {
          NOTION_API_KEY: env.NOTION_API_KEY ? "Set" : "Not Set",
          NOTION_DATABASE_ID: env.NOTION_DATABASE_ID ? "Set" : "Not Set",
          R2_BUCKET: env.MY_BUCKET ? "Connected" : "Not Connected",
          timestamp: new Date().toISOString(),
        };

        console.log(
          `[CONFIG CHECK] Configuration status: ${JSON.stringify(configStatus)}`
        );
        return new Response(JSON.stringify(configStatus, null, 2), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error(
          `[CONFIG ERROR] Error checking configuration: ${error.message}`
        );
        return new Response(`Error checking configuration: ${error.message}`, {
          status: 500,
        });
      }
    }

    // Add an endpoint to get bucket contents
    if (request.method === "GET" && path === "list-bucket") {
      console.log(`[BUCKET] Listing bucket contents`);
      try {
        const options = {
          limit: 100,
          prefix: request.query?.prefix || "",
        };

        const objects = await env.MY_BUCKET.list(options);

        const fileList = {
          files: objects.objects.map((obj) => ({
            name: obj.key,
            size: obj.size,
            uploaded: obj.uploaded,
          })),
          count: objects.objects.length,
          truncated: objects.truncated,
        };

        console.log(`[BUCKET] Found ${fileList.count} files in bucket`);
        return new Response(JSON.stringify(fileList, null, 2), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error(
          `[BUCKET ERROR] Error listing bucket contents: ${error.message}`
        );
        return new Response(`Error listing bucket contents: ${error.message}`, {
          status: 500,
        });
      }
    }

    // Add manual trigger endpoint with detailed response
    if (request.method === "POST" && path === "run-test") {
      console.log("[TRIGGER] Manual trigger received for Notion to R2 process");

      try {
        // Create a Response to return immediately
        const response = new Response(
          JSON.stringify({
            message: "Notion-to-R2 process triggered manually",
            status: "running in background",
            triggerTime: new Date().toISOString(),
          }),
          {
            headers: { "Content-Type": "application/json" },
          }
        );

        // Use waitUntil to allow the fetch to return while the processing continues
        ctx.waitUntil(
          (async () => {
            try {
              console.log("[TRIGGER] Starting async process for Notion to R2");
              await fetchNotionDataToR2(env);
              console.log("[TRIGGER] Async process completed successfully");
            } catch (error) {
              console.error(
                `[TRIGGER ERROR] Async process failed: ${error.message}`
              );
              console.error(error.stack);
            }
          })()
        );

        return response;
      } catch (error) {
        console.error(
          `[TRIGGER ERROR] Error setting up trigger: ${error.message}`
        );
        return new Response(`Error triggering process: ${error.message}`, {
          status: 500,
        });
      }
    }

    // GET endpoint to serve files from R2
    if (request.method === "GET" && path) {
      console.log(`[GET] Request for file: ${path}`);
      try {
        const object = await env.MY_BUCKET.get(path);

        if (object === null) {
          console.log(`[GET] Object not found: ${path}`);
          return new Response("Object Not Found", { status: 404 });
        }

        console.log(
          `[GET] Successfully retrieved: ${path} (${object.size} bytes)`
        );

        // Get content type from object metadata or infer from extension
        let contentType = object.httpMetadata?.contentType;
        if (!contentType) {
          if (path.endsWith(".json")) contentType = "application/json";
          else if (path.endsWith(".txt")) contentType = "text/plain";
          else contentType = "application/octet-stream";
        }

        return new Response(object.body, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control":
              object.httpMetadata?.cacheControl || "max-age=3600",
          },
        });
      } catch (error) {
        console.error(
          `[GET ERROR] Error retrieving file ${path}: ${error.message}`
        );
        return new Response(`Error retrieving file: ${error.message}`, {
          status: 500,
        });
      }
    }

    // PUT operations to R2
    if (request.method === "PUT" && path) {
      console.log(`[PUT] Request to store file: ${path}`);
      try {
        // Determine content type from request headers or filename
        let contentType = request.headers.get("Content-Type");
        if (!contentType) {
          if (path.endsWith(".json")) contentType = "application/json";
          else if (path.endsWith(".txt")) contentType = "text/plain";
          else contentType = "application/octet-stream";
        }

        // Store with metadata
        await env.MY_BUCKET.put(path, request.body, {
          httpMetadata: {
            contentType: contentType,
            cacheControl: "max-age=3600",
          },
        });

        console.log(`[PUT] Successfully stored file: ${path}`);
        return new Response(`Put ${path} successfully!`);
      } catch (error) {
        console.error(
          `[PUT ERROR] Error storing file ${path}: ${error.message}`
        );
        return new Response(`Error storing data: ${error.message}`, {
          status: 500,
        });
      }
    }

    // Handle other request methods
    console.log(`[ERROR] Unsupported method: ${request.method}`);
    return new Response(`${request.method} is not allowed for path: ${path}`, {
      status: 405,
      headers: {
        Allow: "GET, PUT, POST",
      },
    });
  },
};

/**
 * Main function to fetch data from Notion and save it to R2
 */
async function fetchNotionDataToR2(env) {
  console.log("[INFO] Starting Notion data fetch process");

  try {
    // Initialize Notion client
    const notion = new Client({ auth: env.NOTION_API_KEY });
    const n2m = new NotionToMarkdown({ notionClient: notion });

    try {
      // First, retrieve database metadata
      console.log(`[INFO] Retrieving database metadata...`);
      const databaseInfo = await notion.databases.retrieve({
        database_id: env.NOTION_DATABASE_ID,
      });
      console.log(
        `[INFO] Database title: ${
          databaseInfo.title[0]?.plain_text || "Unnamed Database"
        }`
      );

      // Start querying the database with pagination to get ALL records
      console.log(
        `[INFO] Starting pagination to retrieve ALL records from Notion database: ${env.NOTION_DATABASE_ID.substring(
          0,
          8
        )}...`
      );

      let allResults = [];
      let hasMore = true;
      let nextCursor = undefined;
      let pageCount = 0;

      // Implement pagination to retrieve all pages
      while (hasMore) {
        pageCount++;
        console.log(`[INFO] Fetching page ${pageCount} of results...`);

        const response = await notion.databases.query({
          database_id: env.NOTION_DATABASE_ID,
          page_size: 100, // Maximum allowed by Notion API
          start_cursor: nextCursor,
        });

        allResults = [...allResults, ...response.results];
        hasMore = response.has_more;
        nextCursor = response.next_cursor;

        console.log(
          `[INFO] Retrieved ${response.results.length} records (total so far: ${allResults.length})`
        );

        if (hasMore) {
          console.log(
            `[INFO] More records available, continuing pagination...`
          );
        }
      }

      console.log(`[INFO] Pagination complete!`);
      console.log(`[INFO] =============================================`);
      console.log(`[INFO] VERIFICATION:`);
      console.log(`[INFO] Total pages fetched: ${pageCount}`);
      console.log(`[INFO] Total records retrieved: ${allResults.length}`);
      console.log(`[INFO] =============================================`);

      // Store the complete data
      console.log("[INFO] Preparing ALL data for R2 storage");
      const jsonData = JSON.stringify(allResults, null, 2);
      const fileSizeKB = (jsonData.length / 1024).toFixed(2);

      // Upload to R2
      console.log(
        `[INFO] Uploading to R2 as blog-data.json (${fileSizeKB} KB)`
      );
      try {
        await env.MY_BUCKET.put("blog-data.json", jsonData, {
          httpMetadata: {
            contentType: "application/json",
            cacheControl: "max-age=3600", // Cache for 1 hour
          },
        });
        console.log(
          `[INFO] Successfully uploaded blog-data.json to R2 bucket (${fileSizeKB} KB)`
        );

        return allResults;
      } catch (r2Error) {
        console.error(`[ERROR] Failed to upload to R2: ${r2Error.message}`);
        throw r2Error;
      }
    } catch (queryError) {
      console.error(
        `[ERROR] Notion database query failed: ${queryError.message}`
      );

      // Additional error information for Notion API errors
      if (queryError.code) {
        console.error(
          `[ERROR] Notion API error: ${queryError.code} - ${queryError.message}`
        );
      }

      throw queryError;
    }
  } catch (error) {
    console.error(`[ERROR] Error in fetchNotionDataToR2: ${error.message}`);
    throw error;
  }
}

/**
 * Cloudflare Worker Handlers
 */

// HTTP request handler for API usage
async function handleFetch(request, env, ctx) {
  console.log(`[REQUEST] Handling ${request.method} request to ${request.url}`);
  const url = new URL(request.url);
  const path = url.pathname.slice(1);

  // Configuration check endpoint
  if (request.method === "GET" && path === "check-config") {
    try {
      // Safely check configuration (don't expose actual values)
      const configStatus = {
        NOTION_API_KEY: env.NOTION_API_KEY ? "Set" : "Not Set",
        NOTION_DATABASE_ID: env.NOTION_DATABASE_ID ? "Set" : "Not Set",
        R2_BUCKET: env.MY_BUCKET ? "Connected" : "Not Connected",
        timestamp: new Date().toISOString(),
      };

      return new Response(JSON.stringify(configStatus, null, 2), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error(`[ERROR] Configuration check failed: ${error.message}`);
      return new Response(`Error checking configuration: ${error.message}`, {
        status: 500,
      });
    }
  }

  // List bucket contents endpoint
  if (request.method === "GET" && path === "list-bucket") {
    try {
      const options = {
        limit: 100,
        prefix: request.query?.prefix || "",
      };

      const objects = await env.MY_BUCKET.list(options);

      const fileList = {
        files: objects.objects.map((obj) => ({
          name: obj.key,
          size: obj.size,
          uploaded: obj.uploaded,
        })),
        count: objects.objects.length,
        truncated: objects.truncated,
      };

      return new Response(JSON.stringify(fileList, null, 2), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error(`[ERROR] Listing bucket contents failed: ${error.message}`);
      return new Response(`Error listing bucket contents: ${error.message}`, {
        status: 500,
      });
    }
  }

  // Manual trigger endpoint
  if (request.method === "POST" && path === "run-test") {
    console.log("[INFO] Manual trigger received for Notion to R2 process");

    try {
      // Create a Response to return immediately
      const response = new Response(
        JSON.stringify({
          message: "Notion-to-R2 process triggered manually",
          status: "running in background",
          triggerTime: new Date().toISOString(),
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      // Use waitUntil to allow the fetch to return while the processing continues
      ctx.waitUntil(
        (async () => {
          try {
            await fetchNotionDataToR2(env);
            console.log("[INFO] Notion to R2 process completed successfully");
          } catch (error) {
            console.error(
              `[ERROR] Notion to R2 process failed: ${error.message}`
            );
          }
        })()
      );

      return response;
    } catch (error) {
      console.error(`[ERROR] Failed to trigger process: ${error.message}`);
      return new Response(`Error triggering process: ${error.message}`, {
        status: 500,
      });
    }
  }

  // GET endpoint to serve files from R2
  if (request.method === "GET" && path) {
    try {
      const object = await env.MY_BUCKET.get(path);

      if (object === null) {
        return new Response("Object Not Found", { status: 404 });
      }

      // Get content type from object metadata or infer from extension
      let contentType = object.httpMetadata?.contentType;
      if (!contentType) {
        if (path.endsWith(".json")) contentType = "application/json";
        else if (path.endsWith(".txt")) contentType = "text/plain";
        else contentType = "application/octet-stream";
      }

      return new Response(object.body, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": object.httpMetadata?.cacheControl || "max-age=3600",
        },
      });
    } catch (error) {
      console.error(
        `[ERROR] Failed to retrieve file ${path}: ${error.message}`
      );
      return new Response(`Error retrieving file: ${error.message}`, {
        status: 500,
      });
    }
  }

  // PUT operations to R2
  if (request.method === "PUT" && path) {
    try {
      // Determine content type from request headers or filename
      let contentType = request.headers.get("Content-Type");
      if (!contentType) {
        if (path.endsWith(".json")) contentType = "application/json";
        else if (path.endsWith(".txt")) contentType = "text/plain";
        else contentType = "application/octet-stream";
      }

      // Store with metadata
      await env.MY_BUCKET.put(path, request.body, {
        httpMetadata: {
          contentType: contentType,
          cacheControl: "max-age=3600",
        },
      });

      return new Response(`Put ${path} successfully!`);
    } catch (error) {
      console.error(`[ERROR] Failed to store file ${path}: ${error.message}`);
      return new Response(`Error storing data: ${error.message}`, {
        status: 500,
      });
    }
  }

  // Handle other request methods
  return new Response(`${request.method} is not allowed for path: ${path}`, {
    status: 405,
    headers: {
      Allow: "GET, PUT, POST",
    },
  });
}

// Scheduled trigger handler
async function handleScheduled(event, env, ctx) {
  console.log("[INFO] Scheduled event triggered");
  try {
    ctx.waitUntil(fetchNotionDataToR2(env));
  } catch (error) {
    console.error(`[ERROR] Scheduled event failed: ${error.message}`);
  }
}

// Export handlers in the format expected by Cloudflare Workers
addEventListener("fetch", (event) => {
  event.respondWith(handleFetch(event.request, event.env, event));
});

addEventListener("scheduled", (event) => {
  event.waitUntil(handleScheduled(event, event.env, event));
});
