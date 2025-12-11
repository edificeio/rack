import { ApiProperty } from "@decorators/custom-type.decorator";
import { IsString, IsNumber } from "class-validator";

export class RackMetadataDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  filename: string;

  @ApiProperty({
    description: "Content type (e.g., 'application/pdf', 'image/jpeg')",
  })
  @IsString()
  "content-type": string;

  @ApiProperty()
  @IsString()
  "content-transfer-encoding": string;

  @ApiProperty()
  @IsString()
  charset: string;

  @ApiProperty()
  @IsNumber()
  size: number;
}

export class RackThumbnailsDto {
  [key: string]: string;
}
