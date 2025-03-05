// worker.js
const { Client } = require("@notionhq/client");
const { NotionToMarkdown } = require("notion-to-md");

/**
 * Cloudflare Worker for Notion to R2 integration
 * The worker fetches data from Notion and stores it in R2
 */
module.exports = {
  // Scheduled trigger (runs automatically according to cron pattern)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(fetchNotionDataToR2(env));
  },

  // HTTP request handler (for API usage)
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.slice(1);

    // Allow direct PUT operations to R2
    if (request.method === "PUT") {
      try {
        await env.MY_BUCKET.put(path, request.body);
        return new Response(`Put ${path} successfully!`);
      } catch (error) {
        return new Response(`Error storing data: ${error.message}`, {
          status: 500,
        });
      }
    }

    // Handle other request methods
    return new Response(`${request.method} is not allowed.`, {
      status: 405,
      headers: {
        Allow: "PUT",
      },
    });
  },
};

/**
 * Main function to fetch data from Notion and save it to R2
 */
async function fetchNotionDataToR2(env) {
  console.log("Starting Notion data fetch...");

  try {
    // Initialize Notion client
    const notion = new Client({ auth: env.NOTION_API_KEY });
    const n2m = new NotionToMarkdown({ notionClient: notion });

    // 1. Call the Notion DB and fetch all data
    const response = await notion.databases.query({
      database_id: env.NOTION_DATABASE_ID,
      filter: {
        property: "Published",
        checkbox: { equals: true },
      },
      sorts: [{ property: "Date", direction: "descending" }],
      page_size: 100, // Maximum allowed by Notion API
    });

    console.log(`Found ${response.results.length} published posts in Notion`);

    // 2. Create structured data in a convenient format
    const posts = [];
    const categories = new Set(["All"]);

    for (const page of response.results) {
      // Format basic info
      const post = formatPost(page);

      // Add category to categories set
      if (post.category) {
        categories.add(post.category);
      }

      // Get content
      try {
        const mdBlocks = await n2m.pageToMarkdown(page.id);
        post.content = n2m.toMarkdownString(mdBlocks).parent;
      } catch (error) {
        console.error(`Error getting content for ${post.title}:`, error);
        post.content = "Error loading content";
      }

      posts.push(post);
    }

    // Build final data object
    const blogData = {
      posts,
      categories: Array.from(categories),
      totalPosts: posts.length,
      lastUpdated: new Date().toISOString(),
    };

    // 3. Store the Notion data in R2
    const jsonData = JSON.stringify(blogData, null, 2);

    // Upload to R2 using direct binding instead of S3 API
    await env.MY_BUCKET.put("blog-data.json", jsonData, {
      httpMetadata: {
        contentType: "application/json",
        cacheControl: "max-age=3600", // Cache for 1 hour
      },
    });

    console.log(`Success! Uploaded ${posts.length} posts to R2 bucket`);

    // Also create a timestamped backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    await env.MY_BUCKET.put(`backups/blog-data-${timestamp}.json`, jsonData, {
      httpMetadata: {
        contentType: "application/json",
      },
    });

    console.log(`Created backup at backups/blog-data-${timestamp}.json`);

    return blogData;
  } catch (error) {
    console.error("Error fetching Notion data or uploading to R2:", error);
    throw error;
  }
}

/**
 * Format a Notion page into a clean blog post object
 */
function formatPost(page) {
  const props = page.properties;

  // Extract title
  const title =
    props.Title?.title?.map((t) => t.plain_text).join("") || "Untitled";

  // Extract date
  const dateProperty = props.Date?.date;
  let date = "No date";
  let isoDate = null;

  if (dateProperty) {
    const postDate = new Date(dateProperty.start);
    isoDate = postDate.toISOString();

    // Calculate relative time for display
    const now = new Date();
    const diffInMonths = (now - postDate) / (1000 * 60 * 60 * 24 * 30);

    if (diffInMonths < 1) {
      const diffInDays = Math.floor((now - postDate) / (1000 * 60 * 60 * 24));
      date = diffInDays <= 1 ? "Today" : `${diffInDays} days ago`;
    } else if (diffInMonths < 12) {
      const months = Math.floor(diffInMonths);
      date = `${months} ${months === 1 ? "month" : "months"} ago`;
    } else {
      const years = Math.floor(diffInMonths / 12);
      date = `${years} ${years === 1 ? "year" : "years"} ago`;
    }
  }

  // Extract other properties
  return {
    id: page.id,
    title,
    date,
    isoDate,
    summary: props.Summary?.rich_text?.map((t) => t.plain_text).join("") || "",
    category: props.Category?.select?.name || "Uncategorized",
    slug:
      props.Slug?.rich_text?.map((t) => t.plain_text).join("") ||
      title.toLowerCase().replace(/\s+/g, "-"),
    r2ImageUrl: props.R2ImageUrl?.url || "/images/blog-placeholder.jpg",
    minRead:
      props.MinRead?.rich_text?.map((t) => t.plain_text).join("") ||
      "2 Min Read",
    likes: props.Likes?.number || 0,
    comments: props.Comments?.number || 0,
  };
}

/**
 * Cloudflare Worker Handlers
 */

// HTTP request handler for API usage
async function handleFetch(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname.slice(1);

  // Allow direct PUT operations to R2
  if (request.method === "PUT") {
    try {
      await env.MY_BUCKET.put(path, request.body);
      return new Response(`Put ${path} successfully!`);
    } catch (error) {
      return new Response(`Error storing data: ${error.message}`, {
        status: 500,
      });
    }
  }

  // Handle other request methods
  return new Response(`${request.method} is not allowed.`, {
    status: 405,
    headers: {
      Allow: "PUT",
    },
  });
}

// Scheduled trigger handler
async function handleScheduled(event, env, ctx) {
  ctx.waitUntil(fetchNotionDataToR2(env));
}

// Export handlers in the format expected by Cloudflare Workers
addEventListener("fetch", (event) => {
  event.respondWith(handleFetch(event.request, event.env, event));
});

addEventListener("scheduled", (event) => {
  event.waitUntil(handleScheduled(event, event.env, event));
});
