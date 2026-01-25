import { IsNotEmpty } from 'class-validator';

export class UploadImageDto {
  @IsNotEmpty()
  file: Buffer;

  constructor(file: Buffer) {
    this.file = file;
  }
}
