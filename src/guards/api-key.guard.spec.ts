import {
  ExecutionContext,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";

import { ApiKeyGuard } from "./api-key.guard";

describe("ApiKeyGuard", () => {
  let guard: ApiKeyGuard;
  let logger: Logger;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyGuard,
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
                API_SECRET: "test-secret-key",
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    guard = module.get<ApiKeyGuard>(ApiKeyGuard);
    logger = module.get<Logger>(Logger);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe("canActivate", () => {
    it("should reject request without API key", async () => {
      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            headers: {},
          }),
        }),
      };

      await expect(
        guard.canActivate(mockContext as unknown as ExecutionContext)
      ).rejects.toThrow(UnauthorizedException);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("without API key")
      );
    });

    it("should reject request with invalid API key", async () => {
      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            headers: {
              key: "wrong-key",
            },
          }),
        }),
      };

      await expect(
        guard.canActivate(mockContext as unknown as ExecutionContext)
      ).rejects.toThrow(UnauthorizedException);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("invalid API key")
      );
    });

    it("should allow request with valid API key", async () => {
      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            headers: {
              key: "test-secret-key",
            },
          }),
        }),
      };

      const result = await guard.canActivate(
        mockContext as unknown as ExecutionContext
      );

      expect(result).toBe(true);
    });

    it("should throw UnauthorizedException with correct message for missing key", async () => {
      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            headers: {},
          }),
        }),
      };

      await expect(
        guard.canActivate(mockContext as unknown as ExecutionContext)
      ).rejects.toThrow(new UnauthorizedException("API key required"));
    });

    it("should throw UnauthorizedException with correct message for invalid key", async () => {
      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            headers: {
              key: "invalid-key",
            },
          }),
        }),
      };

      await expect(
        guard.canActivate(mockContext as unknown as ExecutionContext)
      ).rejects.toThrow(new UnauthorizedException("Invalid API key"));
    });

    it("should handle request with key in headers", async () => {
      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            headers: {
              key: "test-secret-key",
            },
          }),
        }),
      };

      const result = await guard.canActivate(
        mockContext as unknown as ExecutionContext
      );

      expect(result).toBe(true);
      expect(mockContext.switchToHttp).toHaveBeenCalled();
    });

    it("should handle null headers gracefully", async () => {
      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            headers: null,
          }),
        }),
      };

      await expect(
        guard.canActivate(mockContext as unknown as ExecutionContext)
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should handle undefined headers gracefully", async () => {
      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({}),
        }),
      };

      await expect(
        guard.canActivate(mockContext as unknown as ExecutionContext)
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should be case-sensitive for API key comparison", async () => {
      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            headers: {
              key: "TEST-SECRET-KEY",
            },
          }),
        }),
      };

      await expect(
        guard.canActivate(mockContext as unknown as ExecutionContext)
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should log error when API key is missing", async () => {
      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            headers: {},
          }),
        }),
      };

      await guard
        .canActivate(mockContext as unknown as ExecutionContext)
        .catch(() => {
          /* Expected to fail */
        });

      expect(logger.error).toHaveBeenCalled();
    });

    it("should log error when API key is invalid", async () => {
      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            headers: {
              key: "wrong-key",
            },
          }),
        }),
      };

      await guard
        .canActivate(mockContext as unknown as ExecutionContext)
        .catch(() => {
          /* Expected to fail */
        });

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("API_SECRET initialization", () => {
    it("should read API_SECRET from ConfigService on instantiation", () => {
      expect(configService.get).toHaveBeenCalledWith("API_SECRET");
    });

    it("should handle undefined API_SECRET gracefully", () => {
      const mockConfigService = {
        get: jest.fn(() => undefined),
      };

      // Should not throw
      expect(
        () =>
          new ApiKeyGuard(logger, mockConfigService as unknown as ConfigService)
      ).not.toThrow();
    });
  });
});
