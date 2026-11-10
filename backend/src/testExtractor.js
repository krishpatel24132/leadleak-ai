
import { extractWebsite } from "./services/websiteExtractor.js";

try {
  console.log("Starting website extraction...");

  const result = await extractWebsite("https://example.com");

  console.log("\nExtraction result:");
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error("\nExtraction failed:");
  console.error(error.message);
}
