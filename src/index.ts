import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import fs from "fs";
import helmet from "helmet";
import path from "path";
import sharp from "sharp";
import { getResizedImage, saveImage } from "./utils";

dotenv.config();

const PORT = 11111;
const API_SECRET = process.env.API_SECRET || "defaultSecret";
const APP_ORIGIN = process.env.APP_ORIGIN || "*";
const CACHE_DURATION = Number(process.env.CACHE_DURATION) || 300;
const SAVE_MAX_HEIGHT = Number(process.env.SAVE_MAX_HEIGHT) || 1080;
const SAVE_MAX_WIDTH = Number(process.env.SAVE_MAX_WIDTH) || 1920;
const API_WINDOW_MIN_DELAY = Number(process.env.API_WINDOW_MIN_DELAY) || 15;
const API_LIMIT_REQUESTS_BY_WINDOW_AND_IP =
  Number(process.env.API_LIMIT_REQUESTS_BY_WINDOW_AND_IP) || 50;

const app = express();

app.use(bodyParser.raw({ type: ["image/*"], limit: "10mb" }));
app.use(helmet());
app.use(helmet({ crossOriginResourcePolicy: { policy: "same-site" } }));

const apiLimiter = rateLimit({
  windowMs: API_WINDOW_MIN_DELAY * 60 * 1000,
  max: API_LIMIT_REQUESTS_BY_WINDOW_AND_IP,
  standardHeaders: true,
  legacyHeaders: false,
});

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
  const file = req.params.file;
  const filepath = path.resolve(`public/images/${file}`);

  if (!fs.existsSync(filepath)) {
    res.status(404).send("Image not found");
    return;
  }

  const { h, w } = req.query;

  if (!h && !w) {
    res.sendFile(filepath, { maxAge: CACHE_DURATION * 1000 });
    return;
  }

  const image = await sharp(filepath);
  const metadata = await image.metadata();

  const buffer = await getResizedImage(filepath, w, h);

  res
    .set("Cache-control", `public, max-age=${CACHE_DURATION}`)
    .type(metadata.format as string)
    .send(buffer);
});

app.post("/img/:name", apiLimiter, async function (req, res) {
  const filename = req.params.name;
  const imgData = req.body;
  const { key } = req.query;

  if (key !== API_SECRET) {
    res.status(403).send("You are unauthorized to upload image");
    return;
  }

  if (!filename) {
    res.status(500).send("No filename found");
    return;
  }

  if (!imgData || JSON.stringify(imgData) === "{}") {
    res.status(500).send("No img data found into the request");
    return;
  }

  const filepath = path.resolve(`public/images/${filename}`);

  try {
    await saveImage(imgData, filepath, SAVE_MAX_WIDTH, SAVE_MAX_HEIGHT);
    res.send("ok");
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send(
        "Error during upload of your image. Please check that your image is JPEG, PNG, WebP, GIF, AVIF, TIFF and SVG type and below 10Mb."
      );
  }
});

app.delete("/img/:filename", apiLimiter, function (req, res) {
  const { key } = req.query;

  const filename = req.params.filename;
  const filepath = path.resolve(`public/images/${filename}`);

  if (key !== API_SECRET) {
    res.status(403).send("You are unauthorized to delete image");
    return;
  }

  if (!fs.existsSync(filepath)) {
    res.status(404).send("Image not found");
    return;
  }

  fs.unlink(filepath, function (err) {
    if (err) return console.error(err);
    res.send("ok");
  });
});

app.listen(PORT, () => {
  console.info(`Lite CDN available on port ${PORT}`);
});
