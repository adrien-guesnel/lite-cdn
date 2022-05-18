import fs from "fs";
import path from "path";
import { createPublicDirectory, saveImage } from "../src/utils";

createPublicDirectory();

describe("saveImage", () => {
  test("save landscape jpeg image", async () => {
    const imgData = fs.readFileSync(
      path.join(__dirname, "/images/landscape.jpeg")
    );

    await saveImage(imgData, "public/landscape.webp", 1920, 1080);

    const imageAtTest = fs.readFileSync("public/landscape.webp");
    const imageModel = fs.readFileSync(
      path.join(__dirname, "/model/landscape.webp")
    );

    expect(imageAtTest).toEqual(imageModel);
  });

  test("save vertical jpeg image", async () => {
    const imgData = fs.readFileSync(
      path.join(__dirname, "/images/nightsky.jpeg")
    );

    await saveImage(imgData, "public/nightsky.webp", 1920, 1080);

    const imageAtTest = fs.readFileSync("public/nightsky.webp");
    const imageModel = fs.readFileSync(
      path.join(__dirname, "/model/nightsky.webp")
    );

    expect(imageAtTest).toEqual(imageModel);
  });

  test("save avif image", async () => {
    const imgData = fs.readFileSync(
      path.join(__dirname, "/images/amsterdam.avif")
    );

    await saveImage(imgData, "public/amsterdam_avif.webp", 1920, 1080);

    const imageAtTest = fs.readFileSync("public/amsterdam_avif.webp");
    const imageModel = fs.readFileSync(
      path.join(__dirname, "/model/amsterdam_avif.webp")
    );

    expect(imageAtTest).toEqual(imageModel);
  });

  test("save png image", async () => {
    const imgData = fs.readFileSync(
      path.join(__dirname, "/images/amsterdam.png")
    );

    await saveImage(imgData, "public/amsterdam_png.webp", 1920, 1080);

    const imageAtTest = fs.readFileSync("public/amsterdam_png.webp");
    const imageModel = fs.readFileSync(
      path.join(__dirname, "/model/amsterdam_png.webp")
    );

    expect(imageAtTest).toEqual(imageModel);
  });

  test("save tiff image", async () => {
    const imgData = fs.readFileSync(
      path.join(__dirname, "/images/amsterdam.tiff")
    );

    await saveImage(imgData, "public/amsterdam_tiff.webp", 1920, 1080);

    const imageAtTest = fs.readFileSync("public/amsterdam_tiff.webp");
    const imageModel = fs.readFileSync(
      path.join(__dirname, "/model/amsterdam_tiff.webp")
    );

    expect(imageAtTest).toEqual(imageModel);
  });
});
