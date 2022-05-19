import fs from "fs";
import path from "path";
import { getResizedImage, saveImage } from "../src/utils";

describe.only("test", () => {
  test("test", () => {
    expect(true).toEqual(true);
  });
});

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

describe.only("getResizedImage", () => {
  test.only("test resize with only width", async () => {
    console.log("bufferAtTest", path.join(__dirname, "/images/landscape.jpeg"));
    const bufferAtTest = await getResizedImage(
      path.join(__dirname, "/images/landscape.jpeg"),
      700,
      null
    );
    console.log("buffer ok");
    const imageModel = fs.readFileSync(
      path.join(__dirname, "/model/landscape_w700.jpeg")
    );
    console.log(
      "imageModel",
      path.join(__dirname, "/model/landscape_w700.jpeg")
    );

    expect(bufferAtTest).toEqual(imageModel);
  });

  test("test resize with only height", async () => {
    const bufferAtTest = await getResizedImage(
      path.join(__dirname, "/images/landscape.jpeg"),
      null,
      300
    );

    const imageModel = fs.readFileSync(
      path.join(__dirname, "/model/landscape_h300.jpeg")
    );

    expect(bufferAtTest).toEqual(imageModel);
  });

  test("test resize with height and width", async () => {
    const bufferAtTest = await getResizedImage(
      path.join(__dirname, "/images/landscape.jpeg"),
      100,
      300
    );

    const imageModel = fs.readFileSync(
      path.join(__dirname, "/model/landscape_h300_w100.jpeg")
    );

    expect(bufferAtTest).toEqual(imageModel);
  });
});
