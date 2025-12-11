import { ApiProperty } from "@decorators/custom-type.decorator";
import { Type } from "@decorators/custom-type.decorator";
import { IsNumber, IsArray, IsString } from "class-validator";
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
