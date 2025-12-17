import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { rackService } from "../api/rack.service";
import { useTranslation } from "react-i18next";
import { useEdificeClient, useToast } from "@edifice.io/react";

export const rackQueryOptions = {
  getDocuments: () =>
    queryOptions({
      queryKey: ["rack", "documents"],
      queryFn: () => rackService.listRack(),
    }),
};

export const useRackDocuments = () => useQuery(rackQueryOptions.getDocuments());

/**
 * Mutation to move a document to trash
 */
export const useTrashRackDocument = () => {
  const queryClient = useQueryClient();
  const { appCode } = useEdificeClient();
  const { t } = useTranslation(appCode);
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => rackService.trashRack(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rack", "documents"] });
      toast.success(t("rack.toast.trashed"));
    },
    onError: () => {
      toast.error(t("rack.toast.error"));
    },
  });
};

/**
 * Mutation to permanently delete a document
 */
export const useDeleteRackDocument = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { appCode } = useEdificeClient();
  const { t } = useTranslation(appCode);
  return useMutation({
    mutationFn: (id: string) => rackService.deleteRackDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rack", "documents"] });
      toast.success(t("rack.toast.deleted"));
    },
    onError: () => {
      toast.error(t("rack.toast.error"));
    },
  });
};

/**
 * Mutation to restore a document from trash
 */
export const useRestoreRackDocument = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { appCode } = useEdificeClient();
  const { t } = useTranslation(appCode);
  return useMutation({
    mutationFn: (id: string) => rackService.recoverRack(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rack", "documents"] });
      toast.success(t("rack.toast.restored"));
    },
    onError: () => {
      toast.error(t("rack.toast.error"));
    },
  });
};

/**
 * Mutation to post a document to recipients
 */
export const usePostRackDocument = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { appCode } = useEdificeClient();
  const { t } = useTranslation(appCode);

  return useMutation({
    mutationFn: (data: {
      file: File;
      recipients: string[];
      application?: string;
    }) => rackService.postRack(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rack", "documents"] });
      toast.success(t("rack.toast.uploaded"));
    },
    onError: (error) => {
      toast.error(error?.message || t("rack.toast.error"));
    },
  });
};

/**
 * Mutation to post several documents to recipients
 */
export const usePostRackDocuments = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { appCode } = useEdificeClient();
  const { t } = useTranslation(appCode);

  return useMutation({
    mutationFn: (data: {
      files: File[];
      recipients: string[];
      application?: string;
    }) => rackService.postRacks(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rack", "documents"] });
      toast.success(t("rack.toast.uploaded"));
    },
    onError: (error) => {
      toast.error(error?.message || t("rack.toast.error"));
    },
  });
};

export const useSearchUsers = (search: string, minLength = 1) =>
  useQuery({
    queryKey: ["rack", "search", search],
    queryFn: async () => {
      if (search.length < minLength) {
        return {
          groups: [],
          users: [],
        };
      }
      return rackService.searchUsers({ search });
    },
    enabled: search.length >= minLength,
  });

export const useListUsersInGroup = (groupId: string, enabled = true) =>
  useQuery({
    queryKey: ["rack", "group-users", groupId],
    queryFn: () => rackService.listUsersInGroup(groupId),
    enabled: !!groupId && enabled,
  });

export const useGroupUsersFetcher = () => {
  const queryClient = useQueryClient();

  const fetchGroupUsers = async (groupId: string) => {
    if (!groupId) return [];
    return await queryClient.fetchQuery({
      queryKey: ["rack", "group-users", groupId],
      queryFn: () => rackService.listUsersInGroup(groupId),
    });
  };

  return fetchGroupUsers;
};
