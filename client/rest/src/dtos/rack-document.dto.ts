import { ApiProperty } from "@decorators/custom-type.decorator";
import { Type } from "@decorators/custom-type.decorator";
import { IsString, IsOptional } from "class-validator";
import { RackMetadataDto, RackThumbnailsDto } from "./rack-metadata.dto";

export class RackDocumentDto {
  @ApiProperty({
    description: "Document ID",
    required: false,
  })
  @IsString()
  @IsOptional()
  _id?: string;

  @ApiProperty({
    description: "Recipient user ID",
  })
  @IsString()
  to: string;

  @ApiProperty({
    description: "Recipient display name",
  })
  @IsString()
  toName: string;

  @ApiProperty({
    description: "Sender user ID",
  })
  @IsString()
  from: string;

  @ApiProperty({
    description: "Sender display name",
  })
  @IsString()
  fromName: string;

  @ApiProperty({
    description: "Sent timestamp in ISO format",
  })
  @IsString()
  sent: string;

  @ApiProperty({
    description: "Document name",
  })
  @IsString()
  name: string;

  @ApiProperty()
  @Type(() => RackMetadataDto)
  metadata: RackMetadataDto;

  @ApiProperty({
    description: "File ID in storage",
  })
  @IsString()
  file: string;

  @ApiProperty({
    description: "Application that created the document",
  })
  @IsString()
  application: string;

  @ApiProperty({
    required: false,
  })
  @Type(() => RackThumbnailsDto)
  @IsOptional()
  thumbnails?: RackThumbnailsDto;

  @ApiProperty({
    description: "Folder path",
    required: false,
  })
  @IsString()
  @IsOptional()
  folder?: string;

  @ApiProperty({
    description: "Shared users/groups",
    required: false,
  })
  @IsOptional()
  shared?: unknown;

  @ApiProperty({
    description: "Document comments",
    required: false,
  })
  @IsOptional()
  comments?: unknown;

  @ApiProperty({
    description: "Whether the document is protected",
    required: false,
  })
  @IsOptional()
  protected?: boolean;

  @ApiProperty({
    description: "Owner user ID (for workspace documents)",
    required: false,
  })
  @IsString()
  @IsOptional()
  owner?: string;

  @ApiProperty({
    description: "Owner display name",
    required: false,
  })
  @IsString()
  @IsOptional()
  ownerName?: string;

  @ApiProperty({
    description: "Creation timestamp",
    required: false,
  })
  @IsString()
  @IsOptional()
  created?: string;

  @ApiProperty({
    description: "Last modification timestamp",
    required: false,
  })
  @IsString()
  @IsOptional()
  modified?: string;
}
