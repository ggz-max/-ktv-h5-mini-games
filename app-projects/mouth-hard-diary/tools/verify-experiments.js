const fs = require("fs");
const path = require("path");
const http = require("http");

const root = path.resolve(__dirname, "..");
const experimentPath = path.join(root, "server", "data", "experiments.json");
const experiments = JSON.parse(fs.readFileSync(experimentPath, "utf8"));

function request(pathname) {
  return new Promise((resolve, reject) => {
    http.get({
      hostname: "127.0.0.1",
      port: Number(process.env.PORT || 4327),
      path: pathname
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, data }));
    }).on("error", reject);
  });
}

(async () => {
  const variants = experiments.entryCopy && experiments.entryCopy.variants;
  if (!variants || Object.keys(variants).length < 3) {
    throw new Error("entryCopy variants must have at least 3 variants");
  }

  for (const [key, variant] of Object.entries(variants)) {
    ["headline", "lead", "primaryCta", "secondaryCta"].forEach((field) => {
      if (!variant[field]) throw new Error(`variant ${key} missing ${field}`);
    });
    const response = await request(`/api/v1/mouth-hard/config?variant=${encodeURIComponent(key)}`);
    const json = JSON.parse(response.data);
    if (response.status !== 200 || json.entryVariant !== key || json.entryCopy.headline !== variant.headline) {
      throw new Error(`config variant failed: ${key}`);
    }
  }

  console.log(`experiment verify ok: ${Object.keys(variants).join(", ")}`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
