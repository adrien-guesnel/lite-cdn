import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";

@Injectable()
export class ValidateFilenamePipe implements PipeTransform {
  transform(value: string): string {
    if (!value || value.trim() === "") {
      throw new BadRequestException("Filename is required");
    }

    // Reject if filename contains path traversal patterns
    if (value.includes("..") || value.includes("/") || value.includes("\\")) {
      throw new BadRequestException(
        "Invalid filename: path traversal detected"
      );
    }

    // Reject if filename is too long
    if (value.length > 255) {
      throw new BadRequestException(
        "Invalid filename: must be between 1 and 255 characters"
      );
    }

    // Only allow alphanumeric, hyphens, underscores, and dots
    if (!/^[a-zA-Z0-9._-]+$/.test(value)) {
      throw new BadRequestException(
        "Invalid filename: only alphanumeric, dots, hyphens and underscores allowed"
      );
    }

    return value;
  }
}
