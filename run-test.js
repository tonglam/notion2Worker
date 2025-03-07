// run-test.js
import { Client } from "@notionhq/client";
import fs from "fs";

async function fetchNotionData() {
  console.log("[INFO] Starting Notion data fetch process");

  try {
    // Initialize Notion client with API key from environment variable
    const notionApiKey =
      process.env.NOTION_API_KEY ||
      "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";
    const notionDatabaseId =
      process.env.NOTION_DATABASE_ID || "1ab7ef86-a5ad-81ab-a4cb-f8b8f37ec491";

    const notion = new Client({ auth: notionApiKey });

    try {
      // First, let's check the database structure to understand what we're working with
      console.log(`[INFO] Retrieving database metadata...`);
      const databaseInfo = await notion.databases.retrieve({
        database_id: notionDatabaseId,
      });
      console.log(
        `[INFO] Database title: ${
          databaseInfo.title[0]?.plain_text || "Unnamed Database"
        }`
      );

      // Start querying the database with pagination to get ALL records
      console.log(
        `[INFO] Starting pagination to retrieve ALL records from Notion database: ${notionDatabaseId.substring(
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
          database_id: notionDatabaseId,
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

      // Store the complete data as JSON file
      console.log("[INFO] Saving ALL data to blog-data.json");
      const jsonData = JSON.stringify(allResults, null, 2);

      fs.writeFileSync("blog-data.json", jsonData);
      console.log("[INFO] Successfully saved blog-data.json");
      console.log(
        `[INFO] File size: ${(jsonData.length / 1024).toFixed(2)} KB`
      );

      return allResults;
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
    console.error(`[ERROR] Error in fetchNotionData: ${error.message}`);
    throw error;
  }
}

// Run the function
fetchNotionData().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
