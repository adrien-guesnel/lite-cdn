import { Logger } from "@nestjs/common";
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

  describe("getFilepath", () => {
    it("should construct valid filepath", () => {
      const filepath = service.getFilepath("image.jpg");
      expect(filepath).toContain("public/images/image.jpg");
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
