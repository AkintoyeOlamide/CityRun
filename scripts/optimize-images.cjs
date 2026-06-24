const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const imagesDir = path.join(process.cwd(), "public", "images");

async function optimizeJpeg(name, maxWidth) {
  const input = path.join(imagesDir, name);
  if (!fs.existsSync(input)) return;

  const webpOut = path.join(imagesDir, name.replace(/\.jpe?g$/i, ".webp"));
  const pipeline = sharp(input).rotate().resize({
    width: maxWidth,
    withoutEnlargement: true,
  });

  await pipeline.clone().webp({ quality: 82 }).toFile(webpOut);

  const tmp = `${input}.tmp.jpg`;
  await pipeline.clone().jpeg({ quality: 82, mozjpeg: true }).toFile(tmp);
  fs.renameSync(tmp, input);

  const stat = fs.statSync(webpOut);
  console.log(`  ${name} → ${path.basename(webpOut)} (${Math.round(stat.size / 1024)} KB)`);
}

async function main() {
  console.log("Optimizing images in public/images…\n");

  await optimizeJpeg("hero-premium.jpg", 1920);
  await optimizeJpeg("hero-logistics.jpg", 1600);
  await optimizeJpeg("city-move.jpg", 1600);
  await optimizeJpeg("city-access.jpg", 1600);
  await optimizeJpeg("about-team.jpg", 1200);
  await optimizeJpeg("city-run.jpg", 1200);

  const cardOut = path.join(imagesDir, "city-run-card.webp");
  await sharp(path.join(imagesDir, "city-run.jpg"))
    .rotate()
    .resize(384, 384, { fit: "cover" })
    .webp({ quality: 78 })
    .toFile(cardOut);
  console.log(`  city-run-card.webp (${Math.round(fs.statSync(cardOut).size / 1024)} KB)`);

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
