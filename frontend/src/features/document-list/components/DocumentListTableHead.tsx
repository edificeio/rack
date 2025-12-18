import { Table, IconButton, useEdificeClient } from "@edifice.io/react";
import { IconArrowDown, IconArrowUp } from "@edifice.io/react/icons";
import { useTranslation } from "react-i18next";
import { useDocumentListStore } from "../store/documentListStore";
import upDownIcon from "~/assets/images/up-down.svg";

export const DocumentListTableHead = () => {
  const { appCode } = useEdificeClient();
  const { t } = useTranslation(appCode);
  const filter = useDocumentListStore.use.filter();
  const handleSort = useDocumentListStore.use.handleSort();
  const getSortIcon = useDocumentListStore.use.getSortIcon();
  const isSortActive = useDocumentListStore.use.isSortActive();

  // Determine which label to show based on filter
  const getPersonLabel = (): string => {
    switch (filter) {
      case "deposits":
        return t("rack.table.to");
      case "inbox":
      case "trash":
      default:
        return t("rack.table.from");
    }
  };

  const getSortIconComponent = (sortIcon: string) => {
    switch (sortIcon) {
      case "sort-up":
        return <IconArrowUp />;
      case "sort-down":
        return <IconArrowDown />;
      default:
        return <img src={upDownIcon} />;
    }
  };

  const renderHeader = (
    label: string,
    sortField: "name" | "person" | "date",
  ) => (
    <div className="d-flex align-items-center gap-8">
      <span>{label}</span>
      <IconButton
        variant="ghost"
        color="tertiary"
        icon={getSortIconComponent(getSortIcon(sortField))}
        size="sm"
        onClick={() => handleSort(sortField)}
        style={
          isSortActive(sortField) ? { color: "#4A4A4A" } : { color: "#B0B0B0" }
        }
      />
    </div>
  );

  return (
    <>
      <Table.Th className="ps-16" style={{ width: "40px" }}>
        {/* Checkbox column */}
      </Table.Th>
      <Table.Th>{renderHeader(t("rack.table.name"), "name")}</Table.Th>
      <Table.Th>{renderHeader(getPersonLabel(), "person")}</Table.Th>
      <Table.Th>{renderHeader(t("rack.table.date"), "date")}</Table.Th>
    </>
  );
};
