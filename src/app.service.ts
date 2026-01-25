import { Injectable } from "@nestjs/common";

import { version } from "@/package.json";

@Injectable()
export class AppService {
  getVersion(): string {
    if (process.env.NODE_ENV === "production") {
      return `Lite CDN v${version}`;
    }

    return "Lite CDN dev";
  }
}
