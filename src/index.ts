import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import Jimp from "jimp";
import path from "path";
import url from "url";

dotenv.config();

const PORT = 11111;
const UPLOAD_SECRET = process.env.UPLOAD_SECRET || "defaultSecret";
const APP_ORIGIN = process.env.APP_ORIGIN || "*";
const CACHE_DURATION = Number(process.env.CACHE_DURATION) || 300;
const SAVE_MAX_HEIGHT = Number(process.env.SAVE_MAX_HEIGHT) || 1080;
const SAVE_MAX_WIDTH = Number(process.env.SAVE_MAX_WIDTH) || 1920;

const app = express();

app.use(bodyParser.raw({ type: ["image/jpeg", "image/png"], limit: "10mb" }));

const corsOptions = {
  origin: APP_ORIGIN,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.get("/", (req, res) => {
  res.send("ok");
});

app.get("/health", (req, res) => {
  res.send("ok");
});

app.get("/img/:file", async function (req, res) {
  res.removeHeader("Transfer-Encoding");
  res.removeHeader("X-Powered-By");

  const query = url.parse(req.url, true).query;
  const file = req.params.file;
  const filePath = path.resolve(`public/images/${file}`);

  if (!fs.existsSync(filePath)) {
    res.status(404).send("Image not found");
    return;
  }

  const { h, w, q } = query;

  if (!h && !w && !q) {
    res.sendFile(filePath, { maxAge: CACHE_DURATION * 1000 });
    return;
  }

  const height = Number(h) || 0;
  const width = Number(w) || 0;
  const quality = Number(q) <= 100 && Number(q) >= 0 ? Number(q) : 100;

  Jimp.read(filePath).then((img) => {
    img.quality(quality);
    const mimeType = img.getMIME();

    if (width && height) {
      img.cover(width, height);
    } else if (width) {
      img.resize(width, Jimp.AUTO);
    } else if (height) {
      img.resize(Jimp.AUTO, height);
    }

    img.getBuffer(mimeType, (error, img) => {
      res
        .set("Cache-control", `public, max-age=${CACHE_DURATION}`)
        .type(mimeType)
        .send(img);
    });
  });
});

app.post("/img/:name", function (req, res) {
  const fileName = req.params.name;
  const imgData = req.body;
  const key = req.query.key;

  if (key !== UPLOAD_SECRET) {
    console.error("Bad key");
    res
      .status(500)
      .send(
        "Error during upload of your image. Please check that your image is jpeg or png type and below 10Mb."
      );
    return;
  }

  const filePath = path.resolve(`public/images/${fileName}`);

  Jimp.read(imgData)
    .then((image) => {
      image.scaleToFit(SAVE_MAX_WIDTH, SAVE_MAX_HEIGHT);
      image.quality(80);
      image.write(filePath, () => {
        res.end();
      });
    })
    .catch((err) => {
      console.error(err);
      res
        .status(500)
        .send(
          "Error during upload of your image. Please check that your image is jpeg or png type and below 10Mb."
        );
    });
});

app.listen(PORT, () => {
  console.info(`Lite CDN available on port ${PORT}`);
});
