import { odeServices } from "@edifice.io/client";
import { useEdificeClient, useToast } from "@edifice.io/react";
import { useTranslation } from "react-i18next";
import type { RackDocumentDto } from "@edifice.io/rack-client-rest";

export const useRackDocumentActions = () => {
  const toast = useToast();
  const { appCode } = useEdificeClient();
  const { t } = useTranslation(appCode);

  const downloadDocument = async (docId: string): Promise<Blob | null> => {
    try {
      const response = await fetch(`/rack/get/${docId}`);
      if (!response.ok) throw new Error("Failed to download");
      return await response.blob();
    } catch (error) {
      console.error("Download error", error);
      toast.error(t("rack.toast.downloadError"));
      return null;
    }
  };

  const sendDocumentsToWorkspace = async (
    documents: RackDocumentDto[],
    selectedFolderId: string,
  ): Promise<boolean> => {
    const total = documents.length;
    try {
      const uploadPromises = documents.map(async (doc) => {
        const blob = await downloadDocument(doc._id || doc.file);
        if (!blob) return null;

        const file = new File([blob], doc.name, { type: blob.type });
        return odeServices.workspace().saveFile(file, {
          parentId: selectedFolderId,
        });
      });

      const results = await Promise.allSettled(uploadPromises);
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = total - succeeded;

      if (succeeded === 0) {
        toast.error(t("rack.toast.copyToWorkspaceFailed", { count: total }));
        return false;
      }

      if (failed > 0) {
        toast.warning(
          t("rack.toast.copyToWorkspacePartialFailed", {
            succeeded,
            failed,
          }),
        );
      } else {
        if (documents.length === 1) {
          toast.success(
            t("rack.toast.copyToWorkspaceSuccess", { count: total }),
          );
        } else {
          toast.success(
            t("rack.toast.copyToWorkspaceSuccess_plural", { count: total }),
          );
        }
      }
      return succeeded > 0;
    } catch (error) {
      console.error("Copy to workspace error", error);
      toast.error(t("rack.toast.error"));
      return false;
    }
  };

  return {
    downloadDocument,
    sendDocumentsToWorkspace,
  };
};
