
import ipaddr from "ipaddr.js";
import { load } from "cheerio";
import { fetch } from "undici";

import {
  resolvePublicAddresses,
  createPinnedAgent,
} from "./dnsSecurity.js";

const MAX_URL_LENGTH = 2048;
const MAX_RESPONSE_SIZE = 1024 * 1024; // 1 MB
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 10000;

export function validateWebsiteUrl(input) {
  if (typeof input !== "string" || !input.trim()) {
    return { valid: false, error: "Website URL is required" };
  }

  const rawUrl = input.trim();

  if (rawUrl.length > MAX_URL_LENGTH) {
    return { valid: false, error: "Website URL is too long" };
  }

  let url;

  try {
    url = new URL(rawUrl);
  } catch {
    return { valid: false, error: "Invalid website URL" };
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return {
      valid: false,
      error: "Only HTTP and HTTPS URLs are allowed",
    };
  }

  if (url.username || url.password) {
    return {
      valid: false,
      error: "URLs containing credentials are not allowed",
    };
  }

  const allowedPort =
    (url.protocol === "http:" && (!url.port || url.port === "80")) ||
    (url.protocol === "https:" && (!url.port || url.port === "443"));

  if (!allowedPort) {
    return {
      valid: false,
      error: "Non-standard ports are not allowed",
    };
  }

  const hostname = url.hostname
    .replace(/^\[|\]$/g, "")
    .toLowerCase()
    .replace(/\.$/, "");

  if (!hostname) {
    return { valid: false, error: "Website hostname is missing" };
  }

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    return {
      valid: false,
      error: "Local and internal addresses are not allowed",
    };
  }

  if (ipaddr.isValid(hostname)) {
    try {
      if (ipaddr.process(hostname).range() !== "unicast") {
        return {
          valid: false,
          error: "Private or reserved IP addresses are not allowed",
        };
      }
    } catch {
      return { valid: false, error: "Invalid IP address" };
    }
  }

  url.hash = "";

  return {
    valid: true,
    url: url.toString(),
  };
}

// Read response with a strict size limit.
async function readLimitedResponse(response) {
  const contentLength = Number(
    response.headers.get("content-length")
  );

  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_RESPONSE_SIZE
  ) {
    await response.body?.cancel();
    throw new Error("Website response exceeds the 1 MB limit");
  }

  if (!response.body) {
    throw new Error("Website returned an empty response");
  }

  const reader = response.body.getReader();
  const chunks = [];
  let totalSize = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      totalSize += value.byteLength;

      if (totalSize > MAX_RESPONSE_SIZE) {
        await reader.cancel();
        throw new Error("Website response exceeds the 1 MB limit");
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const result = new Uint8Array(totalSize);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder("utf-8").decode(result);
}

// Fetch website with DNS pinning and redirect validation.
async function fetchWebsiteHtml(startUrl) {
  let currentUrl = startUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    const validation = validateWebsiteUrl(currentUrl);

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const url = new URL(validation.url);

    const addresses = await resolvePublicAddresses(url.hostname);
    const dispatcher = createPinnedAgent(addresses);

    let response;

    try {
      response = await fetch(url.toString(), {
        method: "GET",
        dispatcher,
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          "User-Agent": "LeadLeakAI/1.0",
          "Accept": "text/html,application/xhtml+xml",
        },
      });

      const redirectStatuses = [301, 302, 303, 307, 308];

      if (redirectStatuses.includes(response.status)) {
        const location = response.headers.get("location");

        await response.body?.cancel();

        if (!location) {
          throw new Error("Redirect location is missing");
        }

        if (redirectCount === MAX_REDIRECTS) {
          throw new Error("Too many website redirects");
        }

        currentUrl = new URL(location, url).toString();
        continue;
      }

      if (!response.ok) {
        throw new Error(`Website returned HTTP ${response.status}`);
      }

      const contentType = (
        response.headers.get("content-type") || ""
      ).toLowerCase();

      if (
        !contentType.includes("text/html") &&
        !contentType.includes("application/xhtml+xml")
      ) {
        await response.body?.cancel();
        throw new Error("Website did not return HTML content");
      }

      const html = await readLimitedResponse(response);

      return {
        html,
        finalUrl: url.toString(),
      };
    } finally {
      await dispatcher.close();
    }
  }

  throw new Error("Unable to fetch website");
}

// Extract useful public business information.
export async function extractWebsite(input) {
  const validation = validateWebsiteUrl(input);

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const { html, finalUrl } = await fetchWebsiteHtml(validation.url);

  const $ = load(html);

  $("script, style, noscript, svg, iframe").remove();

  const title = $("title").first().text().trim();

  const description =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    "";

  const headings = $("h1, h2, h3")
    .map((_, element) => $(element).text().trim())
    .get()
    .filter(Boolean)
    .slice(0, 30);

  const pageText = $("body")
    .text()
    .replace(/\s+/g, " ")
    .trim();

  const emailMatches =
    pageText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];

  const emails = [
    ...new Set(emailMatches.map((email) => email.toLowerCase())),
  ].slice(0, 20);

  const phoneMatches =
    pageText.match(/\+?\d[\d\s().-]{7,}\d/g) || [];

  const phones = [
    ...new Set(
      phoneMatches.filter((phone) => {
        const digits = phone.replace(/\D/g, "");
        return digits.length >= 8 && digits.length <= 15;
      })
    ),
  ].slice(0, 20);

  return {
    success: true,
    website: finalUrl,
    title,
    description: description.trim(),
    headings,
    emails,
    phones,
    text: pageText.slice(0, 12000),
  };
}
