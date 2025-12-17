import { useCallback } from "react";
import { useUploadSearch } from "./useUploadSearch";
import { useUploadDocuments } from "./useUploadDocuments";
import { usePostRackDocuments } from "~/services/queries/rack.queries";
import { useGroupUsersFetcher } from "~/services/queries/rack.queries";
import { useRackStore } from "~/store/rackStore";
import { useNavigate } from "react-router-dom";

export const useUploadActions = () => {
  const setOpenedModal = useRackStore.use.setOpenedModal();
  const navigate = useNavigate();

  const {
    searchInputValue,
    searchResults,
    isSearchLoading,
    hasSearchNoResults,
    searchMinLength,
    selectedRecipients,
    handleSearchInputChange,
    handleAddRecipient,
    handleRemoveRecipient,
  } = useUploadSearch();

  const { uploadedFiles, handleFilesChange, clearFiles } = useUploadDocuments();
  const postMutation = usePostRackDocuments();
  const fetchGroupUsers = useGroupUsersFetcher();

  const isFormValid = uploadedFiles.length > 0 && selectedRecipients.length > 0;

  const expandGroupsToUserIds = useCallback(
    async (recipients: typeof selectedRecipients): Promise<string[]> => {
      const userIds: string[] = [];

      for (const recipient of recipients) {
        if (recipient.type === "user") {
          userIds.push(recipient.id);
        } else if (recipient.type === "group") {
          try {
            const usersInGroup = await fetchGroupUsers(recipient.id);
            userIds.push(...usersInGroup.map((u) => u.id));
          } catch (error) {
            console.error(
              `Failed to fetch users for group ${recipient.id}:`,
              error,
            );
          }
        }
      }

      return userIds;
    },
    [fetchGroupUsers],
  );

  const handleClose = useCallback(() => {
    setOpenedModal(null);
    clearFiles();
  }, [setOpenedModal, clearFiles]);

  const handleSubmit = useCallback(async () => {
    if (!isFormValid) return;

    const expandedRecipients = await expandGroupsToUserIds(selectedRecipients);

    if (expandedRecipients.length === 0) {
      return;
    }

    await postMutation.mutateAsync({
      files: uploadedFiles as unknown as File[],
      recipients: expandedRecipients,
    });

    handleClose();
    navigate("/deposits");
  }, [
    isFormValid,
    expandGroupsToUserIds,
    selectedRecipients,
    uploadedFiles,
    postMutation,
    handleClose,
    navigate,
  ]);

  return {
    // Search
    searchInputValue,
    searchResults,
    isSearchLoading,
    hasSearchNoResults,
    searchMinLength,
    handleSearchInputChange,
    handleAddRecipient,
    // Files
    uploadedFiles,
    handleFilesChange,
    // Recipients
    selectedRecipients,
    handleRemoveRecipient,
    // Actions
    handleSubmit,
    handleClose,
    isFormValid,
    isLoading: postMutation.isPending,
  };
};
