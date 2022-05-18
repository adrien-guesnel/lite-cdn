import fs from "fs";
import sharp from "sharp";

export async function saveImage(
  imgData: Buffer | string,
  filepath: string,
  maxWidth: number,
  maxHeight: number
) {
  const image = await sharp(imgData);
  const metadata = await image.metadata();

  await image
    .resize(maxWidth, maxHeight, {
      withoutEnlargement: metadata.format === "svg" ? false : true,
      fit: "inside",
    })
    .toFormat("webp")
    .toFile(filepath);
}

export function createPublicDirectory() {
  const dir = "public";

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
}
