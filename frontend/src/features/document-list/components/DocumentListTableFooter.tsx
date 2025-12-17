import { Flex, IconButton } from "@edifice.io/react";
import {
  IconRafterLeft as ChevronLeft,
  IconRafterRight as ChevronRight,
} from "@edifice.io/react/icons";
import { useDocumentListStore } from "../store/documentListStore";
import { useConfigStore } from "~/store/configStore";
import type { RackDocumentDto } from "@edifice.io/rack-client-rest";

interface DocumentListTableFooterProps {
  documents: RackDocumentDto[];
}

export const DocumentListTableFooter = ({
  documents,
}: DocumentListTableFooterProps) => {
  const config = useConfigStore.use.config();
  const page = useDocumentListStore.use.page();
  const setPage = useDocumentListStore.use.setPage();
  const itemsPerPage = config?.pagination.itemsPerPage || 10;

  if (!documents || documents.length === 0) return null;

  const totalPages = Math.ceil(documents.length / itemsPerPage);

  const handlePagePrevious = () => {
    setPage(Math.max(page - 1, 1));
  };

  const handlePageNext = () => {
    setPage(Math.min(page + 1, totalPages));
  };

  return (
    <Flex justify="center" align="center" gap="8">
      <IconButton
        variant="ghost"
        color="tertiary"
        icon={<ChevronLeft />}
        disabled={page === 1}
        onClick={handlePagePrevious}
        aria-label="Previous page"
      />
      <span className="text-muted">
        {page} / {totalPages}
      </span>
      <IconButton
        variant="ghost"
        color="tertiary"
        icon={<ChevronRight />}
        disabled={page === totalPages}
        onClick={handlePageNext}
        aria-label="Next page"
      />
    </Flex>
  );
};
