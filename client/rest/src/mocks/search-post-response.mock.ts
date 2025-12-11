import { PostDto } from "../dtos";
import { v4 as uuidv4 } from "uuid";

export function randomUuid(): string {
  return uuidv4();
}

export function createMockPost(id: number): PostDto {
  const now = new Date();
  return {
    id,
    title: `Post ${id}`,
    content: `Contenu du post ${id}`,
    authorId: randomUuid(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export function createMockSearchPostResponse(count: number = 10): PostDto[] {
  const posts = Array.from({ length: count }, (_, i) => createMockPost(i + 1));

  return posts;
}

export const mockSearchPostResponse: PostDto[] = createMockSearchPostResponse();

export const mockLargeSearchPostResponse: PostDto[] =
  createMockSearchPostResponse(50);

export const mockEmptySearchPostResponse: PostDto[] = [];
