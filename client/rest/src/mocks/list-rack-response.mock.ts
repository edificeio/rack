import {
  RackDocumentDto,
  RackMetadataDto,
  ListUsersResponseDto,
  UserDto,
  GroupDto,
} from "../dtos";
import { v4 as uuidv4 } from "uuid";

export function randomUuid(): string {
  return uuidv4();
}

export function createMockRackMetadata(): RackMetadataDto {
  return {
    name: "document.pdf",
    filename: "document.pdf",
    "content-type": "application/pdf",
    "content-transfer-encoding": "binary",
    charset: "UTF-8",
    size: 1024000,
  };
}

export function createMockRackDocument(id: string): RackDocumentDto {
  const now = new Date();
  return {
    _id: id,
    to: randomUuid(),
    toName: "Recipient User",
    from: randomUuid(),
    fromName: "Sender User",
    sent: now.toISOString(),
    name: "Sample Document",
    metadata: createMockRackMetadata(),
    file: randomUuid(),
    application: "RACK",
    thumbnails: {
      "120x120": randomUuid(),
      "300x300": randomUuid(),
    },
    folder: "/documents",
    shared: [],
    comments: [],
    protected: false,
    owner: randomUuid(),
    ownerName: "Owner User",
    created: now.toISOString(),
    modified: now.toISOString(),
  };
}

export function createMockListRackResponse(
  count: number = 5,
): RackDocumentDto[] {
  const documents = Array.from({ length: count }, (_, i) =>
    createMockRackDocument(`doc-${i + 1}`),
  );
  return documents;
}

export function createMockUser(): UserDto {
  return {
    id: randomUuid(),
    displayName: "John Doe",
    lastName: "Doe",
    profile: "Student",
  };
}

export function createMockGroup(): GroupDto {
  return {
    id: randomUuid(),
    name: "Class A",
    groupDisplayName: "Classe A",
    structureName: "School XYZ",
  };
}

export function createMockListUsersResponse(): ListUsersResponseDto {
  return {
    groups: [createMockGroup(), createMockGroup()],
    users: [createMockUser(), createMockUser(), createMockUser()],
  };
}

export const mockListRackResponse: RackDocumentDto[] =
  createMockListRackResponse();

export const mockEmptyListRackResponse: RackDocumentDto[] = [];

export const mockListUsersResponse: ListUsersResponseDto =
  createMockListUsersResponse();
