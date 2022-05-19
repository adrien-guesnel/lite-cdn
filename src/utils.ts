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

export async function getResizedImage(
  filepath: string,
  width?: unknown,
  height?: unknown
) {
  return await sharp(filepath)
    .resize(Number(height) || null, Number(width) || null, {
      withoutEnlargement: true,
      fit: "inside",
    })
    .toBuffer();
}
