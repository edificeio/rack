import {
  BaseApiClient,
  ApiClientOptions,
  RequestOptions,
} from "./base-api.client";
import { PostDto, CreatePostDto, UpdatePostDto, PostQueryDto } from "../dtos";

/**
 * Client for interacting with the Post API
 * Provides methods for managing posts
 *
 * @example
 * // Basic usage
 * const postClient = new PostClient();
 * const posts = await postClient.getPosts();
 *
 * @example
 * // With custom configuration
 * const postClient = new PostClient({
 *   baseUrl: 'http://localhost:3000',
 *   defaultHeaders: { 'Authorization': 'Bearer ...' }
 * });
 */
export class PostClient extends BaseApiClient {
  constructor(options: ApiClientOptions = {}) {
    super(options);
  }

  /**
   * Get all posts (optionally with query)
   */
  async getPosts(
    query?: PostQueryDto,
    options?: RequestOptions,
  ): Promise<PostDto[]> {
    const queryParams = new URLSearchParams();
    if (query?.search) queryParams.append("search", query.search);
    if (query?.authorId) queryParams.append("authorId", query.authorId);
    if (query?.limit) queryParams.append("limit", query.limit.toString());
    if (query?.offset) queryParams.append("offset", query.offset.toString());

    return this.get<PostDto[]>("/posts", queryParams, options);
  }

  /**
   * Get a single post by ID
   */
  async getPost(id: number, options?: RequestOptions): Promise<PostDto | null> {
    return this.get<PostDto>(`/posts/${id}`, undefined, options);
  }

  /**
   * Create a new post
   */
  async createPost(
    data: CreatePostDto,
    options?: RequestOptions,
  ): Promise<PostDto> {
    return this.post<PostDto>("/posts", data, undefined, options);
  }

  /**
   * Update a post
   */
  async updatePost(
    id: number,
    data: UpdatePostDto,
    options?: RequestOptions,
  ): Promise<PostDto> {
    return this.put<PostDto>(`/posts/${id}`, data, undefined, options);
  }

  /**
   * Delete a post
   */
  async deletePost(id: number, options?: RequestOptions): Promise<void> {
    return this.delete(`/posts/${id}`, undefined, options);
  }
}
