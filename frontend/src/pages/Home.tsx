import { LoadingScreen } from "@edifice.io/react";
import { QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { DocumentListTable } from "~/features/document-list/components/DocumentListTable";
import { useDocumentListStore } from "~/features/document-list/store/documentListStore";
import { rackQueryOptions } from "~/services/queries/rack.queries";
import { useConfigStore } from "~/store/configStore";

export const loader = (queryClient: QueryClient) => async () => {
  await queryClient.ensureQueryData(rackQueryOptions.getDocuments());
  return null;
};

export const Component = () => {
  const config = useConfigStore.use.config();
  const setFilter = useDocumentListStore.use.setFilter();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/inbox") setFilter("inbox");
    else if (location.pathname === "/deposits") setFilter("deposits");
    else if (location.pathname === "/trash") setFilter("trash");
    else setFilter("inbox"); // fallback
  }, [location.pathname, setFilter]);

  if (!config) {
    return <LoadingScreen />;
  }

  return <DocumentListTable />;
};
