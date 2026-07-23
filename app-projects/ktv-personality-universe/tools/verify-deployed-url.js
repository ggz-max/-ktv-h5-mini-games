const assert = require("assert");

const baseUrl = (process.env.KTV_VERIFY_BASE || "https://ktv-personality-universe.tbox.ktvsky.com").replace(/\/$/, "");

async function readText(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`);
  const text = await response.text();
  return {
    status: response.status,
    contentType: response.headers.get("content-type") || "",
    text
  };
}

async function main() {
  const home = await readText("/");
  assert.equal(home.status, 200, `GET / expected 200, got ${home.status}`);
  assert(
    home.text.includes("KTV 人格宇宙") || home.text.includes("KTV 人格测试") || home.text.includes('data-view="entry"'),
    "GET / did not return the KTV Personality Universe H5. If a logged-in browser works, run this check from the same public route or update KTV_VERIFY_BASE."
  );
  assert(
    !home.text.includes("<title>thunderbox</title>") && !home.text.includes("Casdoor"),
    "GET / returned ThunderBox/Casdoor shell instead of the product H5."
  );

  if (process.env.KTV_VERIFY_API === "1") {
    const health = await readText("/api/health");
    assert.equal(health.status, 200, `GET /api/health expected 200, got ${health.status}`);
    assert(
      health.contentType.includes("application/json"),
      `GET /api/health expected JSON content-type, got ${health.contentType || "empty"}`
    );
    const payload = JSON.parse(health.text);
    assert.equal(payload.ok, true, "GET /api/health expected { ok: true }");
  }

  console.log(`Verified deployed H5 at ${baseUrl}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
