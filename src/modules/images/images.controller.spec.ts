import { BadRequestException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import type { Metadata } from "sharp";

import { ImagesController } from "@src/modules/images/images.controller";
import { ImagesService } from "@src/modules/images/images.service";

describe("ImagesController", () => {
  let controller: ImagesController;
  let imagesService: ImagesService;
  let logger: Logger;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImagesController],
      providers: [
        {
          provide: ImagesService,
          useValue: {
            resolveFilepath: jest.fn(),
            getFilepath: jest.fn(),
            isFileExists: jest.fn(),
            getImageMetadata: jest.fn(),
            getResizedImage: jest.fn(),
            saveImage: jest.fn(),
            deleteImage: jest.fn(),
            verifyKey: jest.fn(),
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
            get: jest.fn((key: string) => {
              const config = {
                saveMaxWidth: 1920,
                saveMaxHeight: 1080,
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<ImagesController>(ImagesController);
    imagesService = module.get<ImagesService>(ImagesService);
    logger = module.get<Logger>(Logger);
  });

  describe("GET /img/:filename", () => {
    it("should reject request without filename", async () => {
      await expect(controller.getImage(undefined)).rejects.toBeInstanceOf(
        BadRequestException
      );
    });

    it("should return 404 if file not found", async () => {
      jest.spyOn(imagesService, "resolveFilepath").mockReturnValue(null);

      await expect(
        controller.getImage("nonexistent.jpg")
      ).rejects.toHaveProperty("status", 404);
    });

    it("should log warning when file not found", async () => {
      jest.spyOn(imagesService, "resolveFilepath").mockReturnValue(null);

      await expect(
        controller.getImage("nonexistent.jpg")
      ).rejects.toBeDefined();

      expect(logger.warn).toHaveBeenCalled();
    });

    it("should call resolveFilepath for file retrieval", async () => {
      jest.spyOn(imagesService, "resolveFilepath").mockReturnValue(null);

      await expect(controller.getImage("image.jpg")).rejects.toBeDefined();

      expect(imagesService.resolveFilepath).toHaveBeenCalledWith("image.jpg");
    });

    it("should resize image when width parameter provided", async () => {
      const mockPath = "/path/to/file";
      jest.spyOn(imagesService, "resolveFilepath").mockReturnValue(mockPath);
      const metadata = {
        format: "webp",
        width: 1920,
        height: 1080,
      } as unknown as Metadata;
      jest.spyOn(imagesService, "getImageMetadata").mockResolvedValue(metadata);
      jest
        .spyOn(imagesService, "getResizedImage")
        .mockResolvedValue(Buffer.from("resized"));

      const result = await controller.getImage("image.jpg", undefined, "800");

      expect(result).toBeDefined();
      expect(imagesService.getResizedImage).toHaveBeenCalledWith(
        mockPath,
        800,
        undefined
      );
    });

    it("should resize image when height parameter provided", async () => {
      const mockPath = "/path/to/file";
      jest.spyOn(imagesService, "resolveFilepath").mockReturnValue(mockPath);
      const metadata = {
        format: "webp",
        width: 1920,
        height: 1080,
      } as unknown as Metadata;
      jest.spyOn(imagesService, "getImageMetadata").mockResolvedValue(metadata);
      jest
        .spyOn(imagesService, "getResizedImage")
        .mockResolvedValue(Buffer.from("resized"));

      const result = await controller.getImage("image.jpg", "600");

      expect(result).toBeDefined();
      expect(imagesService.getResizedImage).toHaveBeenCalledWith(
        mockPath,
        undefined,
        600
      );
    });

    it("should resize image when both width and height provided", async () => {
      const mockPath = "/path/to/file";
      jest.spyOn(imagesService, "resolveFilepath").mockReturnValue(mockPath);
      const metadata = {
        format: "webp",
        width: 1920,
        height: 1080,
      } as unknown as Metadata;
      jest.spyOn(imagesService, "getImageMetadata").mockResolvedValue(metadata);
      jest
        .spyOn(imagesService, "getResizedImage")
        .mockResolvedValue(Buffer.from("resized"));

      const result = await controller.getImage("image.jpg", "600", "800");

      expect(result).toBeDefined();
      expect(imagesService.getResizedImage).toHaveBeenCalledWith(
        mockPath,
        800,
        600
      );
    });

    it("should handle errors during image processing", async () => {
      const mockPath = "/path/to/file";
      jest.spyOn(imagesService, "resolveFilepath").mockReturnValue(mockPath);
      jest
        .spyOn(imagesService, "getImageMetadata")
        .mockRejectedValue(new Error("Invalid image"));

      await expect(
        controller.getImage("image.jpg", "600", "800")
      ).rejects.toHaveProperty("status", 500);

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("POST /img - addImage", () => {
    it("should reject request without API key", async () => {
      const dto = { file: Buffer.from("test") };

      await expect(controller.addImage(dto, undefined)).rejects.toHaveProperty(
        "status",
        401
      );
    });

    it("should log warning when no API key provided", async () => {
      const dto = { file: Buffer.from("test") };

      await expect(controller.addImage(dto, undefined)).rejects.toBeDefined();

      expect(logger.warn).toHaveBeenCalled();
    });

    it("should reject request with invalid API key", async () => {
      const dto = { file: Buffer.from("test") };
      jest.spyOn(imagesService, "verifyKey").mockImplementation(() => {
        throw new BadRequestException("Invalid API key");
      });

      await expect(
        controller.addImage(dto, "invalid-key")
      ).rejects.toHaveProperty("status", 401);
    });

    it("should reject request without image data", async () => {
      const dto = { file: undefined };
      jest.spyOn(imagesService, "verifyKey").mockImplementation(() => {});

      await expect(
        controller.addImage(dto, "valid-key")
      ).rejects.toHaveProperty("status", 400);
    });

    it("should reject when file already exists (UUID collision)", async () => {
      const dto = { file: Buffer.from("test") };
      jest.spyOn(imagesService, "verifyKey").mockImplementation(() => {});
      jest.spyOn(imagesService, "getFilepath").mockReturnValue("/path/file");
      jest.spyOn(imagesService, "isFileExists").mockReturnValue(true);

      await expect(
        controller.addImage(dto, "valid-key")
      ).rejects.toHaveProperty("status", 409);
    });

    it("should return filename with extension on successful upload", async () => {
      const dto = { file: Buffer.from("test") };
      jest.spyOn(imagesService, "verifyKey").mockImplementation(() => {});
      jest.spyOn(imagesService, "getFilepath").mockReturnValue("/path/file");
      jest.spyOn(imagesService, "isFileExists").mockReturnValue(false);
      jest.spyOn(imagesService, "saveImage").mockResolvedValue("webp");

      const result = await controller.addImage(dto, "valid-key");

      expect(result.status).toBe("ok");
      expect(result.filename).toMatch(/\.webp$/);
      expect(logger.log).toHaveBeenCalled();
    });

    it("should log successful upload", async () => {
      const dto = { file: Buffer.from("test") };
      jest.spyOn(imagesService, "verifyKey").mockImplementation(() => {});
      jest.spyOn(imagesService, "getFilepath").mockReturnValue("/path/file");
      jest.spyOn(imagesService, "isFileExists").mockReturnValue(false);
      jest.spyOn(imagesService, "saveImage").mockResolvedValue("webp");

      await controller.addImage(dto, "valid-key");

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining("uploaded successfully")
      );
    });

    it("should handle BadRequestException from service", async () => {
      const dto = { file: Buffer.from("test") };
      jest.spyOn(imagesService, "verifyKey").mockImplementation(() => {});
      jest.spyOn(imagesService, "getFilepath").mockReturnValue("/path/file");
      jest.spyOn(imagesService, "isFileExists").mockReturnValue(false);
      jest
        .spyOn(imagesService, "saveImage")
        .mockRejectedValue(new BadRequestException("File too large"));

      await expect(
        controller.addImage(dto, "valid-key")
      ).rejects.toHaveProperty("status", 400);

      expect(logger.warn).toHaveBeenCalled();
    });

    it("should handle generic errors from service", async () => {
      const dto = { file: Buffer.from("test") };
      jest.spyOn(imagesService, "verifyKey").mockImplementation(() => {});
      jest.spyOn(imagesService, "getFilepath").mockReturnValue("/path/file");
      jest.spyOn(imagesService, "isFileExists").mockReturnValue(false);
      jest
        .spyOn(imagesService, "saveImage")
        .mockRejectedValue(new Error("Unknown error"));

      await expect(
        controller.addImage(dto, "valid-key")
      ).rejects.toHaveProperty("status", 500);

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("DELETE /img/:filename", () => {
    it("should reject request without API key", async () => {
      await expect(
        controller.deleteImage("image.jpg", undefined)
      ).rejects.toHaveProperty("status", 401);
    });

    it("should log warning when no API key provided", async () => {
      await expect(
        controller.deleteImage("image.jpg", undefined)
      ).rejects.toBeDefined();

      expect(logger.warn).toHaveBeenCalled();
    });

    it("should reject request with invalid API key", async () => {
      jest.spyOn(imagesService, "verifyKey").mockImplementation(() => {
        throw new BadRequestException("Invalid API key");
      });

      await expect(
        controller.deleteImage("image.jpg", "invalid-key")
      ).rejects.toHaveProperty("status", 401);
    });

    it("should reject request without filename", async () => {
      jest.spyOn(imagesService, "verifyKey").mockImplementation(() => {});

      await expect(
        controller.deleteImage(undefined, "valid-key")
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("should return 404 if file not found", async () => {
      jest.spyOn(imagesService, "verifyKey").mockImplementation(() => {});
      jest.spyOn(imagesService, "resolveFilepath").mockReturnValue(null);

      await expect(
        controller.deleteImage("nonexistent.jpg", "valid-key")
      ).rejects.toHaveProperty("status", 404);
    });

    it("should log warning when file not found", async () => {
      jest.spyOn(imagesService, "verifyKey").mockImplementation(() => {});
      jest.spyOn(imagesService, "resolveFilepath").mockReturnValue(null);

      await expect(
        controller.deleteImage("nonexistent.jpg", "valid-key")
      ).rejects.toBeDefined();

      expect(logger.warn).toHaveBeenCalled();
    });

    it("should return status ok on successful delete", async () => {
      jest.spyOn(imagesService, "verifyKey").mockImplementation(() => {});
      jest
        .spyOn(imagesService, "resolveFilepath")
        .mockReturnValue("/path/to/file");
      jest.spyOn(imagesService, "deleteImage").mockResolvedValue(true);

      const result = await controller.deleteImage("image.jpg", "valid-key");

      expect(result.status).toBe("ok");
      expect(logger.log).toHaveBeenCalled();
    });

    it("should handle errors during deletion", async () => {
      jest.spyOn(imagesService, "verifyKey").mockImplementation(() => {});
      jest
        .spyOn(imagesService, "resolveFilepath")
        .mockReturnValue("/path/to/file");
      jest
        .spyOn(imagesService, "deleteImage")
        .mockRejectedValue(new Error("Permission denied"));

      await expect(
        controller.deleteImage("image.jpg", "valid-key")
      ).rejects.toHaveProperty("status", 500);

      expect(logger.error).toHaveBeenCalled();
    });
  });
});
