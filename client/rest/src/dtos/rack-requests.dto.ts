import { ApiProperty } from "@decorators/custom-type.decorator";
import { Type } from "@decorators/custom-type.decorator";
import { IsNumber, IsArray, IsOptional, IsString } from "class-validator";
import { RackDocumentDto } from "./rack-document.dto";
import { UserDto, GroupDto } from "./user.dto";

export class PostRackResponseDto {
  @ApiProperty({
    description: "Number of successful sends",
  })
  @IsNumber()
  success: number;

  @ApiProperty({
    description: "Number of failed sends",
  })
  @IsNumber()
  failure: number;
}

export class ListRackResponseDto {
  @ApiProperty({
    type: [RackDocumentDto],
  })
  @Type(() => RackDocumentDto)
  @IsArray()
  documents: RackDocumentDto[];
}

export class ListUsersResponseDto {
  @ApiProperty({
    type: [GroupDto],
  })
  @Type(() => GroupDto)
  @IsArray()
  groups: GroupDto[];

  @ApiProperty({
    type: [UserDto],
  })
  @Type(() => UserDto)
  @IsArray()
  users: UserDto[];
}

export class CopyToNextcloudRequestDto {
  @ApiProperty({
    description: "Array of document IDs to copy",
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  ids: string[];

  @ApiProperty({
    description:
      "Destination folder path, relative to the user's Nextcloud root (optional)",
    required: false,
  })
  @IsOptional()
  @IsString()
  path?: string;
}

export class CopyToNextcloudResultDto {
  @ApiProperty({
    description: "ID of the copied file in the ENT storage",
  })
  @IsString()
  fileId: string;

  @ApiProperty({
    description: "Name of the file in Nextcloud",
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: "Copy status of the file: ok or ko",
  })
  @IsString()
  status: "ok" | "ko";

  @ApiProperty({
    description: "Error of a failed copy",
    required: false,
  })
  @IsOptional()
  @IsString()
  error?: string;
}

export class CopyToNextcloudResponseDto {
  @ApiProperty({
    type: [CopyToNextcloudResultDto],
  })
  @Type(() => CopyToNextcloudResultDto)
  @IsArray()
  data: CopyToNextcloudResultDto[];
}

export class CopyToWorkspaceRequestDto {
  @ApiProperty({
    description: "Array of document IDs to copy",
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  ids: string[];

  @ApiProperty({
    description: "Destination folder (optional)",
    required: false,
  })
  @IsString()
  folder?: string;
}
