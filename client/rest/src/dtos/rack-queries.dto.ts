import { ApiProperty } from "@decorators/custom-type.decorator";
import { IsString, IsOptional } from "class-validator";

export class SearchUsersQueryDto {
  @ApiProperty({
    description: "Search term for users",
    required: false,
  })
  @IsString()
  @IsOptional()
  search?: string;
}

export class GetRackQueryDto {
  @ApiProperty({
    description: "Thumbnail size (e.g., '120x120')",
    required: false,
  })
  @IsString()
  @IsOptional()
  thumbnail?: string;

  @ApiProperty({
    description: "Application context",
    required: false,
  })
  @IsString()
  @IsOptional()
  application?: string;
}
