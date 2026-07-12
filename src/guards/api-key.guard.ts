import { createHash, timingSafeEqual } from "node:crypto";

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const MIN_SECRET_LENGTH = 16;

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly API_SECRET: string;

  constructor(
    private readonly logger: Logger,
    private readonly configService: ConfigService
  ) {
    const secret = this.configService.get<string>("API_SECRET");

    if (!secret || secret.length < MIN_SECRET_LENGTH) {
      throw new Error(
        `API_SECRET must be set and at least ${MIN_SECRET_LENGTH} characters long`
      );
    }

    this.API_SECRET = secret;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const key = req?.headers?.key;

    if (!key || typeof key !== "string") {
      this.logger.error("Request without API key");
      throw new UnauthorizedException("API key required");
    }

    if (!this.isValidKey(key)) {
      this.logger.error("Unauthorized request with invalid API key");
      throw new UnauthorizedException("Invalid API key");
    }

    return true;
  }

  private isValidKey(key: string): boolean {
    const keyHash = createHash("sha256").update(key).digest();
    const secretHash = createHash("sha256").update(this.API_SECRET).digest();
    return timingSafeEqual(keyHash, secretHash);
  }
}
