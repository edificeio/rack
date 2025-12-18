import { Dropdown, useEdificeClient } from "@edifice.io/react";
import {
  IconInbox as Inbox,
  IconFolderAdd as FolderOpen,
  IconDelete as Trash,
} from "@edifice.io/react/icons";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useMenuStore } from "../store/menuStore";
import { useMenuData } from "../hooks/useMenuData";
import { useDocumentListStore } from "~/features/document-list/store/documentListStore";
import { ProgressBar, ProgressBarProps } from "~/components/lib/ProgressBar";
import { ReactElement } from "react";
import type { DocumentFilter } from "~/features/document-list/hooks/useFilteredDocuments";

interface MenuItemConfig {
  id: string;
  label: string;
  icon: ReactElement;
  path: string;
  filter: DocumentFilter;
}

/**
 * Mobile menu component using Dropdown
 * Displays navigation items and quota information
 */
export const MobileMenu = () => {
  const navigate = useNavigate();
  const { appCode } = useEdificeClient();
  const { t } = useTranslation(appCode);
  const { t: common_t } = useTranslation("common");
  const setMobileMenuOpen = useMenuStore.use.setMobileMenuOpen();
  const setFilter = useDocumentListStore.use.setFilter();
  const { usageMB, quotaMB, progress } = useMenuData();

  const menuItems: MenuItemConfig[] = [
    {
      id: "inbox",
      label: t("rack.mine"),
      icon: <Inbox />,
      path: "/inbox",
      filter: "inbox",
    },
    {
      id: "deposits",
      label: t("rack.history"),
      icon: <FolderOpen />,
      path: "/deposits",
      filter: "deposits",
    },
    {
      id: "trash",
      label: t("rack.trash"),
      icon: <Trash />,
      path: "/trash",
      filter: "trash",
    },
  ];

  const filter = useDocumentListStore.use.filter();
  const selectedItem = menuItems.find((item) => item.filter === filter);

  const handleItemClick = (path: string, itemFilter: DocumentFilter) => {
    setFilter(itemFilter);
    navigate(path);
    setMobileMenuOpen(false);
  };

  const progressBarProps: ProgressBarProps = {
    label: `${usageMB} / ${quotaMB} ${common_t("mb")}`,
    progress: progress,
    labelOptions: {
      justify: "end",
    },
    progressOptions: {
      color: progress < 70 ? "info" : progress < 90 ? "warning" : "danger",
    },
  };

  return (
    <div className="mobile-menu position-relative w-100 p-16">
      <Dropdown block onToggle={(visible) => setMobileMenuOpen(visible)}>
        <Dropdown.Trigger
          label={
            <span className="d-flex align-items-center gap-8">
              {selectedItem?.icon}
              {selectedItem?.label || t("rack.documents")}
            </span>
          }
        />
        <Dropdown.Menu>
          {menuItems.map((item) => (
            <Dropdown.Item
              key={item.id}
              onClick={() => handleItemClick(item.path, item.filter)}
              icon={item.icon}
              className={filter === item.filter ? "active" : ""}
            >
              <span>{item.label}</span>
            </Dropdown.Item>
          ))}
          <Dropdown.Separator />
          <Dropdown.Item disabled className="px-3 py-2">
            <div className="d-flex flex-column gap-8 w-100">
              <b className="fs-6">{t("rack.usedSpace")}</b>
              <ProgressBar {...progressBarProps} />
            </div>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
};
