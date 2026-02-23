import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly API_SECRET;

  constructor(
    private readonly logger: Logger,
    private readonly configService: ConfigService
  ) {
    this.API_SECRET = this.configService.get<string>("API_SECRET");
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const key = req?.headers?.key;

    if (!key) {
      this.logger.error("Request without API key");
      throw new UnauthorizedException("API key required");
    }

    if (key !== this.API_SECRET) {
      this.logger.error("Unauthorized request with invalid API key");
      throw new UnauthorizedException("Invalid API key");
    }

    return true;
  }
}
