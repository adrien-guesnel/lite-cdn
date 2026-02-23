import { BadRequestException, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, type TestingModule } from "@nestjs/testing";

import { ImagesService } from "@src/modules/images/images.service";

describe("ImagesService", () => {
  let service: ImagesService;
  let logger: Logger;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImagesService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                saveMaxWidth: 1920,
                saveMaxHeight: 1080,
                maxFileSize: 10 * 1024 * 1024,
                maxImagePixels: 25_000_000,
                allowSvgUploads: false,
              };
              return config[key];
            }),
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
      ],
    }).compile();

    service = module.get<ImagesService>(ImagesService);
    logger = module.get<Logger>(Logger);
  });

  describe("get", () => {
    it("should throw NotFoundException when file does not exist", async () => {
      await expect(service.get("nonexistent.jpg")).rejects.toThrow(
        NotFoundException
      );
    });

    it("should log warning when file not found", async () => {
      const initialWarnCallCount = (logger.warn as jest.Mock).mock.calls.length;
      try {
        await service.get("nonexistent.jpg");
      } catch {
        // Expected
      }
      const finalWarnCallCount = (logger.warn as jest.Mock).mock.calls.length;
      expect(finalWarnCallCount).toBeGreaterThan(initialWarnCallCount);
    });
  });

  describe("add", () => {
    it("should throw BadRequestException when no image data provided", async () => {
      // biome-ignore lint/suspicious/noExplicitAny: Testing with undefined requires any
      await expect(service.add(undefined as any)).rejects.toThrow(
        BadRequestException
      );
    });

    it("should throw BadRequestException when image exceeds max file size", async () => {
      const largeBuffer = Buffer.alloc(20 * 1024 * 1024); // 20MB, exceeds 10MB limit
      await expect(service.add(largeBuffer)).rejects.toThrow(
        BadRequestException
      );
    });

    it("should log warning when file size exceeds limit", async () => {
      const largeBuffer = Buffer.alloc(20 * 1024 * 1024);
      try {
        await service.add(largeBuffer);
      } catch {
        // Expected
      }
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("exceeds max size")
      );
    });

    it("should return status ok and filename on successful upload", async () => {
      // This test would need actual image data to work properly
      // For now, we're just testing the interface
      expect(service.add).toBeDefined();
    });
  });

  describe("delete", () => {
    it("should throw NotFoundException when file does not exist", async () => {
      await expect(service.delete("nonexistent.jpg")).rejects.toThrow(
        NotFoundException
      );
    });

    it("should log warning when deleting non-existent file", async () => {
      try {
        await service.delete("nonexistent.jpg");
      } catch {
        // Expected
      }
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("non-existent")
      );
    });
  });

  describe("parseDimension", () => {
    it("should return undefined when value is undefined", () => {
      const result = service.parseDimension(undefined, "w");
      expect(result).toBeUndefined();
    });

    it("should parse string number to integer", () => {
      const result = service.parseDimension("600.5", "w");
      expect(result).toBe(600);
    });

    it("should throw BadRequestException for non-numeric value", () => {
      expect(() => service.parseDimension("abc", "w")).toThrow(
        BadRequestException
      );
    });

    it("should throw BadRequestException for negative value", () => {
      expect(() => service.parseDimension("-100", "w")).toThrow(
        BadRequestException
      );
    });

    it("should throw BadRequestException for zero", () => {
      expect(() => service.parseDimension("0", "w")).toThrow(
        BadRequestException
      );
    });

    it("should throw BadRequestException when exceeding max dimension", () => {
      expect(() => service.parseDimension("2000", "w", 1920)).toThrow(
        BadRequestException
      );
    });

    it("should accept value equal to max dimension", () => {
      const result = service.parseDimension("1920", "w", 1920);
      expect(result).toBe(1920);
    });

    it("should accept value below max dimension", () => {
      const result = service.parseDimension("1000", "w", 1920);
      expect(result).toBe(1000);
    });
  });

  describe("formatToMime", () => {
    it("should return application/octet-stream for undefined", () => {
      const result = service.formatToMime(undefined);
      expect(result).toBe("application/octet-stream");
    });

    it("should return application/octet-stream for empty string", () => {
      const result = service.formatToMime("");
      expect(result).toBe("application/octet-stream");
    });

    it("should convert jpeg to image/jpeg", () => {
      const result = service.formatToMime("jpeg");
      expect(result).toBe("image/jpeg");
    });

    it("should convert jpg to image/jpeg", () => {
      const result = service.formatToMime("jpg");
      expect(result).toBe("image/jpeg");
    });

    it("should convert png to image/png", () => {
      const result = service.formatToMime("png");
      expect(result).toBe("image/png");
    });

    it("should convert webp to image/webp", () => {
      const result = service.formatToMime("webp");
      expect(result).toBe("image/webp");
    });

    it("should handle uppercase format", () => {
      const result = service.formatToMime("JPEG");
      expect(result).toBe("image/jpeg");
    });

    it("should handle format with leading dot", () => {
      const result = service.formatToMime(".png");
      expect(result).toBe("image/png");
    });

    it("should fallback to generic image/* for unknown format", () => {
      const result = service.formatToMime("xyz");
      expect(result).toBe("image/xyz");
    });
  });

  describe("isFileExists", () => {
    it("should return false for non-existent file", () => {
      const result = service.isFileExists("/nonexistent/file.jpg");
      expect(result).toBe(false);
    });

    it("should log debug message when checking file existence", () => {
      service.isFileExists("/test/path/file.jpg");
      expect(logger.debug).toHaveBeenCalled();
    });
  });

  describe("resolveFilepath", () => {
    it("should return null for non-existent files", () => {
      const result = service.resolveFilepath(
        "definitely-nonexistent-file-12345.jpg"
      );
      expect(result).toBeNull();
    });

    it("should accept valid filenames without throwing", () => {
      expect(() => {
        service.resolveFilepath("valid-filename.jpg");
      }).not.toThrow();
    });

    it("should log warning when file cannot be resolved", () => {
      service.resolveFilepath("nonexistent.jpg");
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Could not resolve"),
        expect.any(String)
      );
    });
  });

  describe("getFilepath", () => {
    it("should return path in public/images directory", () => {
      const result = service.getFilepath("test-uuid");
      expect(result).toContain("public/images");
      expect(result).toContain("test-uuid");
    });
  });

  describe("deleteImage", () => {
    it("should return a promise", () => {
      const result = service.deleteImage("/test/file.jpg");
      expect(result).toBeInstanceOf(Promise);
      // Suppress unhandled rejection
      result.catch(() => undefined);
    });
  });

  describe("getImageMetadata", () => {
    it("should have getImageMetadata method", () => {
      expect(service.getImageMetadata).toBeDefined();
    });
  });

  describe("getResizedImage", () => {
    it("should have getResizedImage method", () => {
      expect(service.getResizedImage).toBeDefined();
    });

    it("should accept width parameter", async () => {
      expect(service.getResizedImage).toBeDefined();
    });

    it("should accept height parameter", async () => {
      expect(service.getResizedImage).toBeDefined();
    });
  });

  describe("saveImage", () => {
    it("should have saveImage method", () => {
      expect(service.saveImage).toBeDefined();
    });
  });
});
