import { odeServices } from "@edifice.io/client";
import { RackClient } from "@edifice.io/rack-client-rest";
import {
  CopyToWorkspaceRequestDto,
  SearchUsersQueryDto,
  GetRackQueryDto,
} from "@edifice.io/rack-client-rest";
import { useConfigStore } from "~/store/configStore";

/**
 * Initialize Rack client with config from store
 */
const initializeRackClient = () => {
  const config = useConfigStore.getState().config;
  const baseUrl = config?.api.baseUrl || "/rack";

  return new RackClient({
    httpService: odeServices.http(),
    baseUrl,
  });
};

let rackClient: RackClient | null = null;

const getRackClient = () => {
  if (!rackClient) {
    rackClient = initializeRackClient();
  }
  return rackClient;
};

export const rackService = {
  listRack: () => getRackClient().listRack(),
  getRack: (id: string, query?: GetRackQueryDto) =>
    getRackClient().getRack(id, query),
  deleteRackDocument: (id: string) => getRackClient().deleteRackDocument(id),
  trashRack: (id: string) => getRackClient().trashRack(id),
  recoverRack: (id: string) => getRackClient().recoverRack(id),
  copyToWorkspace: (request: CopyToWorkspaceRequestDto) =>
    getRackClient().copyToWorkspace(request),
  listUsers: () => getRackClient().listUsers(),
  searchUsers: (query: SearchUsersQueryDto) =>
    getRackClient().searchUsers(query),
  listUsersInGroup: (groupId: string) =>
    getRackClient().listUsersInGroup(groupId),
  postRack: (data: {
    file: File;
    recipients: string[];
    application?: string;
  }) => {
    const formData = new FormData();
    formData.append("file", data.file);
    formData.append("users", data.recipients.join(","));
    if (data.application) {
      formData.append("application", data.application);
    }
    return odeServices.http().postFile("/rack", formData, { headers: {} });
  },
  postRacks: (data: {
    files: File[];
    recipients: string[];
    application?: string;
  }) => {
    return Promise.all(
      data.files.map((file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("users", data.recipients.join(","));
        if (data.application) {
          formData.append("application", data.application);
        }
        return odeServices.http().postFile("/rack", formData, { headers: {} });
      }),
    );
  },
};
