import { BadRequestException } from "@nestjs/common";

import { ValidateFilenamePipe } from "./validate-filename.pipe";

describe("ValidateFilenamePipe", () => {
  let pipe: ValidateFilenamePipe;

  beforeEach(() => {
    pipe = new ValidateFilenamePipe();
  });

  describe("valid filenames", () => {
    it("should accept valid filename with extension", () => {
      const result = pipe.transform("image.jpg");
      expect(result).toBe("image.jpg");
    });

    it("should accept filename with multiple dots", () => {
      const result = pipe.transform("my.image.file.png");
      expect(result).toBe("my.image.file.png");
    });

    it("should accept filename with hyphens and underscores", () => {
      const result = pipe.transform("my-image_file.webp");
      expect(result).toBe("my-image_file.webp");
    });

    it("should accept filename with only letters and numbers", () => {
      const result = pipe.transform("abc123xyz");
      expect(result).toBe("abc123xyz");
    });

    it("should accept UUID-like filename", () => {
      const result = pipe.transform(
        "a0f34c33-a994-4898-aa3c-5d54b9bcc292.webp"
      );
      expect(result).toBe("a0f34c33-a994-4898-aa3c-5d54b9bcc292.webp");
    });

    it("should accept filename with exactly 255 characters", () => {
      const filename = "a".repeat(255);
      const result = pipe.transform(filename);
      expect(result).toBe(filename);
    });

    it("should accept filename with uppercase letters", () => {
      const result = pipe.transform("IMAGE.JPG");
      expect(result).toBe("IMAGE.JPG");
    });

    it("should accept mixed case filename", () => {
      const result = pipe.transform("MyImage-File_123.webp");
      expect(result).toBe("MyImage-File_123.webp");
    });

    it("should accept short single character filename", () => {
      const result = pipe.transform("a");
      expect(result).toBe("a");
    });

    it("should accept filename starting with number", () => {
      const result = pipe.transform("123file.jpg");
      expect(result).toBe("123file.jpg");
    });

    it("should accept filename starting with hyphen", () => {
      const result = pipe.transform("-file.jpg");
      expect(result).toBe("-file.jpg");
    });

    it("should accept filename starting with underscore", () => {
      const result = pipe.transform("_file.jpg");
      expect(result).toBe("_file.jpg");
    });

    it("should accept filename starting with dot", () => {
      const result = pipe.transform(".hiddenfile");
      expect(result).toBe(".hiddenfile");
    });

    it("should accept filename with consecutive hyphens and underscores", () => {
      const result = pipe.transform("file--name__test.jpg");
      expect(result).toBe("file--name__test.jpg");
    });
  });

  describe("invalid - empty or whitespace", () => {
    it("should reject empty string", () => {
      expect(() => pipe.transform("")).toThrow(BadRequestException);
      expect(() => pipe.transform("")).toThrow("Filename is required");
    });

    it("should reject string with only spaces", () => {
      expect(() => pipe.transform("   ")).toThrow(BadRequestException);
      expect(() => pipe.transform("   ")).toThrow("Filename is required");
    });

    it("should reject string with only tabs", () => {
      expect(() => pipe.transform("\t\t")).toThrow(BadRequestException);
      expect(() => pipe.transform("\t\t")).toThrow("Filename is required");
    });

    it("should reject string with mixed whitespace", () => {
      expect(() => pipe.transform(" \t \n ")).toThrow(BadRequestException);
      expect(() => pipe.transform(" \t \n ")).toThrow("Filename is required");
    });
  });

  describe("invalid - path traversal", () => {
    it("should reject parent directory traversal ../", () => {
      expect(() => pipe.transform("../etc/passwd")).toThrow(
        BadRequestException
      );
      expect(() => pipe.transform("../etc/passwd")).toThrow(
        "path traversal detected"
      );
    });

    it("should reject single parent directory ..", () => {
      expect(() => pipe.transform("..")).toThrow(BadRequestException);
    });

    it("should reject multiple parent directory traversals", () => {
      expect(() => pipe.transform("../../etc/passwd")).toThrow(
        BadRequestException
      );
    });

    it("should reject forward slashes", () => {
      expect(() => pipe.transform("dir/file.jpg")).toThrow(BadRequestException);
      expect(() => pipe.transform("dir/file.jpg")).toThrow(
        "path traversal detected"
      );
    });

    it("should reject absolute path with forward slash", () => {
      expect(() => pipe.transform("/etc/passwd")).toThrow(BadRequestException);
    });

    it("should reject backslashes", () => {
      expect(() => pipe.transform("dir\\file.jpg")).toThrow(
        BadRequestException
      );
      expect(() => pipe.transform("dir\\file.jpg")).toThrow(
        "path traversal detected"
      );
    });

    it("should reject absolute Windows path", () => {
      expect(() => pipe.transform("C:\\Windows\\System32")).toThrow(
        BadRequestException
      );
    });

    it("should reject mixed slashes", () => {
      expect(() => pipe.transform("dir/sub\\file.jpg")).toThrow(
        BadRequestException
      );
    });
  });

  describe("invalid - length constraints", () => {
    it("should reject filename exceeding 255 characters", () => {
      const longFilename = "a".repeat(256);
      expect(() => pipe.transform(longFilename)).toThrow(BadRequestException);
      expect(() => pipe.transform(longFilename)).toThrow(
        "must be between 1 and 255 characters"
      );
    });

    it("should reject filename with exactly 256 characters", () => {
      const filename = "a".repeat(256);
      expect(() => pipe.transform(filename)).toThrow(BadRequestException);
    });

    it("should reject very long filename (1000+ chars)", () => {
      const longFilename = "a".repeat(1000);
      expect(() => pipe.transform(longFilename)).toThrow(BadRequestException);
    });
  });

  describe("invalid - special characters", () => {
    it("should reject filename with spaces", () => {
      expect(() => pipe.transform("file with spaces.jpg")).toThrow(
        BadRequestException
      );
      expect(() => pipe.transform("file with spaces.jpg")).toThrow(
        "only alphanumeric"
      );
    });

    it("should reject filename with @ symbol", () => {
      expect(() => pipe.transform("file@domain.jpg")).toThrow(
        BadRequestException
      );
    });

    it("should reject filename with # symbol", () => {
      expect(() => pipe.transform("file#123.jpg")).toThrow(BadRequestException);
    });

    it("should reject filename with $ symbol", () => {
      expect(() => pipe.transform("file$name.jpg")).toThrow(
        BadRequestException
      );
    });

    it("should reject filename with % symbol", () => {
      expect(() => pipe.transform("file%20.jpg")).toThrow(BadRequestException);
    });

    it("should reject filename with parens", () => {
      expect(() => pipe.transform("file(1).jpg")).toThrow(BadRequestException);
    });

    it("should reject filename with brackets", () => {
      expect(() => pipe.transform("file[1].jpg")).toThrow(BadRequestException);
    });

    it("should reject filename with braces", () => {
      expect(() => pipe.transform("file{1}.jpg")).toThrow(BadRequestException);
    });

    it("should reject filename with asterisk", () => {
      expect(() => pipe.transform("file*.jpg")).toThrow(BadRequestException);
    });

    it("should reject filename with question mark", () => {
      expect(() => pipe.transform("file?.jpg")).toThrow(BadRequestException);
    });

    it("should reject filename with pipe symbol", () => {
      expect(() => pipe.transform("file|name.jpg")).toThrow(
        BadRequestException
      );
    });

    it("should reject filename with colon", () => {
      expect(() => pipe.transform("file:name.jpg")).toThrow(
        BadRequestException
      );
    });

    it("should reject filename with semicolon", () => {
      expect(() => pipe.transform("file;name.jpg")).toThrow(
        BadRequestException
      );
    });

    it("should reject filename with comma", () => {
      expect(() => pipe.transform("file,name.jpg")).toThrow(
        BadRequestException
      );
    });

    it("should reject filename with angle brackets", () => {
      expect(() => pipe.transform("file<name>.jpg")).toThrow(
        BadRequestException
      );
    });

    it("should reject filename with backtick", () => {
      expect(() => pipe.transform("file`name.jpg")).toThrow(
        BadRequestException
      );
    });

    it("should reject filename with single quote", () => {
      expect(() => pipe.transform("file'name.jpg")).toThrow(
        BadRequestException
      );
    });

    it("should reject filename with double quote", () => {
      expect(() => pipe.transform('file"name.jpg')).toThrow(
        BadRequestException
      );
    });

    it("should reject filename with ampersand", () => {
      expect(() => pipe.transform("file&name.jpg")).toThrow(
        BadRequestException
      );
    });

    it("should reject filename with plus sign", () => {
      expect(() => pipe.transform("file+name.jpg")).toThrow(
        BadRequestException
      );
    });

    it("should reject filename with equals sign", () => {
      expect(() => pipe.transform("file=name.jpg")).toThrow(
        BadRequestException
      );
    });

    it("should reject filename with tilde", () => {
      expect(() => pipe.transform("file~name.jpg")).toThrow(
        BadRequestException
      );
    });

    it("should reject filename with caret", () => {
      expect(() => pipe.transform("file^name.jpg")).toThrow(
        BadRequestException
      );
    });

    it("should reject filename with exclamation", () => {
      expect(() => pipe.transform("file!name.jpg")).toThrow(
        BadRequestException
      );
    });

    it("should reject filename with unicode characters", () => {
      expect(() => pipe.transform("filé.jpg")).toThrow(BadRequestException);
    });

    it("should reject filename with emoji", () => {
      expect(() => pipe.transform("file😀.jpg")).toThrow(BadRequestException);
    });

    it("should reject filename with tab character", () => {
      expect(() => pipe.transform("file\tname.jpg")).toThrow(
        BadRequestException
      );
    });

    it("should reject filename with newline character", () => {
      expect(() => pipe.transform("file\nname.jpg")).toThrow(
        BadRequestException
      );
    });

    it("should reject filename with carriage return", () => {
      expect(() => pipe.transform("file\rname.jpg")).toThrow(
        BadRequestException
      );
    });
  });

  describe("edge cases", () => {
    it("should preserve return value as-is for valid input", () => {
      const input = "exact-FILENAME.test";
      const result = pipe.transform(input);
      expect(result).toBe(input);
      expect(result).toBe("exact-FILENAME.test"); // Preserves case
    });

    it("should handle filename with exactly 255 characters", () => {
      const filename = `${"a".repeat(254)}.`;
      expect(filename.length).toBe(255);
      const result = pipe.transform(filename);
      expect(result).toBe(filename);
    });

    it("should reject on length boundary at 256", () => {
      const filename = `${"a".repeat(255)}.`;
      expect(filename.length).toBe(256);
      expect(() => pipe.transform(filename)).toThrow(BadRequestException);
    });

    it("should not trim valid filenames with intentional format", () => {
      const filename = "file_with_.webp";
      const result = pipe.transform(filename);
      expect(result).toBe(filename); // Should not trim
    });

    it("should handle filename with many consecutive hyphens", () => {
      const result = pipe.transform("file-----name.jpg");
      expect(result).toBe("file-----name.jpg");
    });

    it("should handle filename with many consecutive underscores", () => {
      const result = pipe.transform("file_____name.jpg");
      expect(result).toBe("file_____name.jpg");
    });

    it("should handle filename starting with single digit", () => {
      const result = pipe.transform("0file.jpg");
      expect(result).toBe("0file.jpg");
    });

    it("should handle filename with only numbers", () => {
      const result = pipe.transform("123456789");
      expect(result).toBe("123456789");
    });
  });

  describe("error messages", () => {
    it("should provide clear error message for empty filename", () => {
      const error = new BadRequestException("Filename is required");
      expect(() => pipe.transform("")).toThrow(error);
    });

    it("should provide clear error message for path traversal", () => {
      const error = new BadRequestException(
        "Invalid filename: path traversal detected"
      );
      expect(() => pipe.transform("../test")).toThrow(error);
    });

    it("should provide clear error message for length violation", () => {
      const error = new BadRequestException(
        "Invalid filename: must be between 1 and 255 characters"
      );
      expect(() => pipe.transform("a".repeat(256))).toThrow(error);
    });

    it("should provide clear error message for invalid characters", () => {
      const error = new BadRequestException(
        "Invalid filename: only alphanumeric, dots, hyphens and underscores allowed"
      );
      expect(() => pipe.transform("file@.jpg")).toThrow(error);
    });
  });
});
