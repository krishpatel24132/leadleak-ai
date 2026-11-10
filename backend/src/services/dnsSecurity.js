
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import ipaddr from "ipaddr.js";
import { Agent } from "undici";

// Only accept the standard NAT64 well-known prefix (/96).
const NAT64_PREFIX = ipaddr.parseCIDR("64:ff9b::/96");

function isPublicIp(address) {
  if (!isIP(address)) return false;

  try {
    const parsed = ipaddr.parse(address);

    // Handle NAT64 translated IPv6 addresses.
    if (
      parsed.kind() === "ipv6" &&
      parsed.match(NAT64_PREFIX)
    ) {
      const embeddedIPv4 = ipaddr.fromByteArray(
        parsed.toByteArray().slice(12)
      );

      return embeddedIPv4.range() === "unicast";
    }

    // Normal IPv4 and IPv6 validation.
    return parsed.range() === "unicast";
  } catch {
    return false;
  }
}

export async function resolvePublicAddresses(hostname) {
  const cleanHostname = hostname
    .replace(/^\[|\]$/g, "")
    .toLowerCase()
    .replace(/\.$/, "");

  if (isIP(cleanHostname)) {
    if (!isPublicIp(cleanHostname)) {
      throw new Error("Private or reserved IP addresses are not allowed");
    }

    return [{
      address: cleanHostname,
      family: isIP(cleanHostname),
    }];
  }

  let addresses;

  try {
    addresses = await lookup(cleanHostname, {
      all: true,
      verbatim: true,
    });
  } catch {
    throw new Error("Unable to resolve website hostname");
  }

  if (!addresses.length) {
    throw new Error("No IP addresses found");
  }

  for (const record of addresses) {
    if (!isPublicIp(record.address)) {
      throw new Error(
        "Website resolves to a private or reserved IP address"
      );
    }
  }

  return addresses;
}

export function createPinnedAgent(addresses) {
  if (!Array.isArray(addresses) || addresses.length === 0) {
    throw new Error("Verified IP addresses are required");
  }

  const pinnedAddresses = addresses.map((record) => ({
    address: record.address,
    family: record.family,
  }));

  const pinnedLookup = (_hostname, options, callback) => {
    let matching = pinnedAddresses;

    if (options?.family) {
      matching = matching.filter(
        (item) => item.family === options.family
      );
    }

    if (matching.length === 0) {
      callback(new Error("No verified IP for requested family"));
      return;
    }

    if (options?.all) {
      callback(null, matching);
    } else {
      callback(
        null,
        matching[0].address,
        matching[0].family
      );
    }
  };

  return new Agent({
    connect: {
      lookup: pinnedLookup,
    },
  });
}
