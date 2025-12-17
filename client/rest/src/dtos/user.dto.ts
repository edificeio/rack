import { ApiProperty } from "@decorators/custom-type.decorator";
import { IsString, IsOptional } from "class-validator";

export class UserDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  displayName: string;

  @ApiProperty({
    required: false,
  })
  @IsString()
  username: string;

  @ApiProperty({
    description: "User profile (e.g., Student, Teacher)",
    required: false,
  })
  @IsString()
  @IsOptional()
  profile?: string;
}

export class GroupDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({
    required: false,
  })
  @IsString()
  @IsOptional()
  groupDisplayName?: string;

  @ApiProperty({
    required: false,
  })
  @IsString()
  @IsOptional()
  structureName?: string;
}
