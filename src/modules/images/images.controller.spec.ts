import { Readable } from "node:stream";

import { Logger, NotFoundException, StreamableFile } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";

import { ImagesController } from "@src/modules/images/images.controller";
import { ImagesService } from "@src/modules/images/images.service";

describe("ImagesController", () => {
  let controller: ImagesController;
  let imagesService: ImagesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImagesController],
      providers: [
        {
          provide: ImagesService,
          useValue: {
            get: jest.fn(),
            add: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
            getOrThrow: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ImagesController>(ImagesController);
    imagesService = module.get<ImagesService>(ImagesService);
  });

  describe("GET /img/:filename", () => {
    it("should call imagesService.get with correct parameters", async () => {
      const mockStream = Readable.from([]);
      jest.spyOn(imagesService, "get").mockResolvedValue({
        file: new StreamableFile(mockStream),
        mime: "image/webp",
      });

      await controller.getImage("test.jpg", "600", "800");

      expect(imagesService.get).toHaveBeenCalledWith("test.jpg", "600", "800");
    });

    it("should return StreamableFile from service", async () => {
      const mockStream = Readable.from([]);
      const mockFile = new StreamableFile(mockStream);
      jest
        .spyOn(imagesService, "get")
        .mockResolvedValue({ file: mockFile, mime: "image/webp" });

      const result = await controller.getImage("test.jpg");

      expect(result).toBe(mockFile);
    });

    it("should propagate errors from service", async () => {
      jest
        .spyOn(imagesService, "get")
        .mockRejectedValue(new NotFoundException("File not found"));

      await expect(controller.getImage("nonexistent.jpg")).rejects.toThrow(
        NotFoundException
      );
    });

    it("should handle height and width parameters", async () => {
      const mockStream = Readable.from([]);
      jest.spyOn(imagesService, "get").mockResolvedValue({
        file: new StreamableFile(mockStream),
        mime: "image/webp",
      });

      await controller.getImage("image.jpg", "400", "600");

      expect(imagesService.get).toHaveBeenCalledWith("image.jpg", "400", "600");
    });

    it("should handle missing height and width parameters", async () => {
      const mockStream = Readable.from([]);
      jest.spyOn(imagesService, "get").mockResolvedValue({
        file: new StreamableFile(mockStream),
        mime: "image/webp",
      });

      await controller.getImage("image.jpg");

      expect(imagesService.get).toHaveBeenCalledWith(
        "image.jpg",
        undefined,
        undefined
      );
    });
  });

  describe("POST /img - addImage", () => {
    it("should call imagesService.add with image data", async () => {
      const imageData = Buffer.from("test data");
      jest.spyOn(imagesService, "add").mockResolvedValue({
        status: "ok",
        filename: "test.webp",
      });

      await controller.addImage(imageData);

      expect(imagesService.add).toHaveBeenCalledWith(imageData);
    });

    it("should return uploaded filename from service", async () => {
      const imageData = Buffer.from("test data");
      jest.spyOn(imagesService, "add").mockResolvedValue({
        status: "ok",
        filename: "uuid.webp",
      });

      const result = await controller.addImage(imageData);

      expect(result).toEqual({ status: "ok", filename: "uuid.webp" });
    });

    it("should propagate errors from service", async () => {
      const imageData = Buffer.from("test data");
      jest
        .spyOn(imagesService, "add")
        .mockRejectedValue(new Error("Upload failed"));

      await expect(controller.addImage(imageData)).rejects.toThrow(
        "Upload failed"
      );
    });
  });

  describe("DELETE /img/:filename", () => {
    it("should call imagesService.delete with filename", async () => {
      jest.spyOn(imagesService, "delete").mockResolvedValue({ status: "ok" });

      await controller.deleteImage("test.webp");

      expect(imagesService.delete).toHaveBeenCalledWith("test.webp");
    });

    it("should return success status from service", async () => {
      jest.spyOn(imagesService, "delete").mockResolvedValue({ status: "ok" });

      const result = await controller.deleteImage("test.webp");

      expect(result).toEqual({ status: "ok" });
    });

    it("should propagate errors from service", async () => {
      jest
        .spyOn(imagesService, "delete")
        .mockRejectedValue(new NotFoundException("File not found"));

      await expect(controller.deleteImage("nonexistent.jpg")).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
