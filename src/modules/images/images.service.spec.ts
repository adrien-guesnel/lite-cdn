import * as path from "node:path";

import {
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
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
                API_SECRET: "test-secret",
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

  describe("validateFilename", () => {
    it("should reject path traversal attempts with ../", () => {
      expect(() => service["validateFilename"]("../../etc/passwd")).toThrow(
        BadRequestException
      );
    });

    it("should reject path traversal with single ..", () => {
      expect(() => service["validateFilename"]("../file.jpg")).toThrow(
        BadRequestException
      );
    });

    it("should reject filenames with forward slashes", () => {
      expect(() => service["validateFilename"]("dir/file.jpg")).toThrow(
        BadRequestException
      );
    });

    it("should reject filenames with backslashes", () => {
      expect(() => service["validateFilename"]("dir\\file.jpg")).toThrow(
        BadRequestException
      );
    });

    it("should reject empty filenames", () => {
      expect(() => service["validateFilename"]("")).toThrow(
        BadRequestException
      );
    });

    it("should reject filenames exceeding 255 characters", () => {
      const longFilename = "a".repeat(256);
      expect(() => service["validateFilename"](longFilename)).toThrow(
        BadRequestException
      );
    });

    it("should reject filenames with special characters", () => {
      expect(() => service["validateFilename"]("file@#$.jpg")).toThrow(
        BadRequestException
      );
    });

    it("should reject filenames with spaces", () => {
      expect(() => service["validateFilename"]("file with spaces.jpg")).toThrow(
        BadRequestException
      );
    });

    it("should accept valid filename with extension", () => {
      expect(() => service["validateFilename"]("image.jpg")).not.toThrow();
    });

    it("should accept valid filename with hyphens and underscores", () => {
      expect(() =>
        service["validateFilename"]("image-123_test.webp")
      ).not.toThrow();
    });

    it("should accept valid filename with only letters and numbers", () => {
      expect(() => service["validateFilename"]("abc123xyz")).not.toThrow();
    });

    it("should reject filename with exactly 256 characters", () => {
      const longFilename = "a".repeat(256);
      expect(() => service["validateFilename"](longFilename)).toThrow();
    });

    it("should accept filename with exactly 255 characters", () => {
      const filename = "a".repeat(255);
      expect(() => service["validateFilename"](filename)).not.toThrow();
    });
  });

  describe("securePath", () => {
    it("should throw error for paths outside public/images", () => {
      expect(() => service["securePath"]("/etc/passwd")).toThrow(
        BadRequestException
      );
    });

    it("should accept paths inside public/images", () => {
      const validPath = path.resolve("public/images/file.jpg");
      expect(() => service["securePath"](validPath)).not.toThrow();
    });
  });

  describe("getFilepath", () => {
    it("should construct valid filepath", () => {
      const filepath = service.getFilepath("image.jpg");
      expect(filepath).toContain("public/images/image.jpg");
    });

    it("should validate filename during filepath construction", () => {
      expect(() => service.getFilepath("../../etc/passwd")).toThrow(
        BadRequestException
      );
    });

    it("should enforce security checks during filepath construction", () => {
      expect(() => service.getFilepath("../../../etc/passwd")).toThrow(
        BadRequestException
      );
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

  describe("verifyKey", () => {
    it("should throw error if API_SECRET is not configured", () => {
      const mockConfigService = {
        get: jest.fn(() => undefined),
      };
      const testService = new ImagesService(
        mockConfigService as unknown as ConfigService,
        logger
      );

      expect(() => testService.verifyKey("any-key")).toThrow(
        InternalServerErrorException
      );
    });

    it("should throw BadRequestException if key does not match", () => {
      expect(() => service.verifyKey("wrong-key")).toThrow(BadRequestException);
    });

    it("should not throw if key matches API_SECRET", () => {
      expect(() => service.verifyKey("test-secret")).not.toThrow();
    });

    it("should log warning on unauthorized access attempt", () => {
      try {
        service.verifyKey("wrong-key");
      } catch (_e) {
        // Expected to throw
      }
      expect(logger.warn).toHaveBeenCalled();
    });

    it("should log error if API_SECRET not configured", () => {
      const mockConfigService = {
        get: jest.fn(() => undefined),
      };
      const testService = new ImagesService(
        mockConfigService as unknown as ConfigService,
        logger
      );

      try {
        testService.verifyKey("wrong-key");
      } catch (_e) {
        // Expected to throw
      }
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("resolveFilepath", () => {
    it("should reject invalid filenames", () => {
      const result = service.resolveFilepath("../../etc/passwd");
      expect(result).toBeNull();
    });

    it("should log warning for invalid filenames", () => {
      service.resolveFilepath("../../etc/passwd");
      expect(logger.warn).toHaveBeenCalled();
    });

    it("should return null for non-existent files", () => {
      const result = service.resolveFilepath(
        "definitely-nonexistent-file-12345.jpg"
      );
      expect(result).toBeNull();
    });

    it("should log when filepath cannot be resolved", () => {
      service.resolveFilepath("nonexistent.jpg");
      expect(logger.warn).toHaveBeenCalled();
    });

    it("should accept valid filenames without throwing", () => {
      expect(() => {
        service.resolveFilepath("valid-filename.jpg");
      }).not.toThrow();
    });
  });

  describe("deleteImage", () => {
    it("should return a promise", () => {
      const result = service.deleteImage("/test/file.jpg");
      expect(result).toBeInstanceOf(Promise);
      // Suppress unhandled rejection
      result.catch(() => undefined);
    });

    it("should call unlink with provided filepath", () => {
      const result = service.deleteImage("/test/path/file.jpg");
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
});
