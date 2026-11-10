
import { validateWebsiteUrl } from "./services/websiteExtractor.js";

const testUrls = [
  "https://example.com",
  "http://google.com",
  "javascript:alert(1)",
  "http://localhost:5000",
  "http://127.0.0.1",
  "http://192.168.1.1",
  "https://example.com:8080",
];

for (const url of testUrls) {
  console.log("\nTesting:", url);
  console.log(validateWebsiteUrl(url));
}
