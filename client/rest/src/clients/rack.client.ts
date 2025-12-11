import {
  BaseApiClient,
  ApiClientOptions,
  RequestOptions,
} from "./base-api.client";
import {
  RackDocumentDto,
  PostRackResponseDto,
  ListUsersResponseDto,
  CopyToWorkspaceRequestDto,
  SearchUsersQueryDto,
  GetRackQueryDto,
  UserDto,
} from "../dtos";

/**
 * Client for interacting with the Rack API
 * Provides methods for managing rack documents and user operations
 *
 * @example
 * // Basic usage
 * const rackClient = new RackClient();
 * const documents = await rackClient.listRack();
 *
 * @example
 * // With custom configuration
 * const rackClient = new RackClient({
 *   baseUrl: 'http://localhost:3000',
 *   defaultHeaders: { 'Authorization': 'Bearer ...' }
 * });
 */
export class RackClient extends BaseApiClient {
  constructor(options: ApiClientOptions = {}) {
    super(options);
  }

  /**
   * Post a document to other users' racks
   * @param formData FormData containing the file and metadata
   * @param options Additional request options
   * @returns Success/failure counts
   */
  async postRack(
    formData: FormData,
    options?: RequestOptions,
  ): Promise<PostRackResponseDto> {
    // Note: This would need special handling for multipart/form-data
    // The base client may need extension for FormData support
    return this.post<PostRackResponseDto>("/", formData, undefined, options);
  }

  /**
   * Delete a document from the rack
   * @param id Document ID
   * @param options Additional request options
   * @returns Promise that resolves when the document is deleted
   */
  async deleteRackDocument(
    id: string,
    options?: RequestOptions,
  ): Promise<void> {
    return this.delete(`/${id}`, undefined, options);
  }

  /**
   * Get a rack document (file download)
   * @param id Document ID
   * @param query Optional query parameters
   * @param options Additional request options
   * @returns Document data or file stream
   */
  async getRack(
    id: string,
    query?: GetRackQueryDto,
    options?: RequestOptions,
  ): Promise<RackDocumentDto | Blob> {
    const queryParams = new URLSearchParams();
    if (query?.thumbnail) queryParams.append("thumbnail", query.thumbnail);
    if (query?.application)
      queryParams.append("application", query.application);

    // This endpoint returns either JSON or file stream
    // The implementation would need to handle both cases
    return this.get<RackDocumentDto>(`/get/${id}`, queryParams, options);
  }

  /**
   * List all documents in the user's rack
   * @param options Additional request options
   * @returns Array of rack documents
   */
  async listRack(options?: RequestOptions): Promise<RackDocumentDto[]> {
    return this.get<RackDocumentDto[]>("/list", undefined, options);
  }

  /**
   * Move a document to trash
   * @param id Document ID
   * @param options Additional request options
   * @returns Promise that resolves when the operation is complete
   */
  async trashRack(id: string, options?: RequestOptions): Promise<void> {
    return this.put(`/${id}/trash`, {}, undefined, options);
  }

  /**
   * Recover a document from trash
   * @param id Document ID
   * @param options Additional request options
   * @returns Promise that resolves when the operation is complete
   */
  async recoverRack(id: string, options?: RequestOptions): Promise<void> {
    return this.put(`/${id}/recover`, {}, undefined, options);
  }

  /**
   * Copy documents from rack to workspace
   * @param request Copy request data
   * @param options Additional request options
   * @returns Operation result
   */
  async copyToWorkspace(
    request: CopyToWorkspaceRequestDto,
    options?: RequestOptions,
  ): Promise<unknown> {
    return this.post("/copy", request, undefined, options);
  }

  /**
   * List users available for sending documents
   * @param options Additional request options
   * @returns Groups and users
   */
  async listUsers(options?: RequestOptions): Promise<ListUsersResponseDto> {
    return this.get<ListUsersResponseDto>(
      "/users/available",
      undefined,
      options,
    );
  }

  /**
   * Search users available for sending documents
   * @param query Search parameters
   * @param options Additional request options
   * @returns Groups and users matching the search
   */
  async searchUsers(
    query: SearchUsersQueryDto,
    options?: RequestOptions,
  ): Promise<ListUsersResponseDto> {
    const queryParams = new URLSearchParams();
    if (query.search) queryParams.append("search", query.search);

    return this.get<ListUsersResponseDto>(
      "/users/available",
      queryParams,
      options,
    );
  }

  /**
   * List users in a specific group
   * @param groupId Group ID
   * @param options Additional request options
   * @returns Users in the group
   */
  async listUsersInGroup(
    groupId: string,
    options?: RequestOptions,
  ): Promise<UserDto[]> {
    return this.get<UserDto[]>(`/users/group/${groupId}`, undefined, options);
  }
}
