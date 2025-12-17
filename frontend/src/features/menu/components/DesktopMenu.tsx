import { Menu, Tree, useEdificeClient } from "@edifice.io/react";
import {
  IconDepositeInbox as Inbox,
  IconFolder as FolderOpen,
  IconDelete as Trash,
} from "@edifice.io/react/icons";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { useMenuData } from "../hooks/useMenuData";
import { useDocumentListStore } from "~/features/document-list/store/documentListStore";
import { ProgressBar, ProgressBarProps } from "~/components/lib/ProgressBar";
import type { TreeItem } from "@edifice.io/react";
import type { DocumentFilter } from "~/features/document-list/hooks/useFilteredDocuments";

export const DesktopMenu = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { appCode } = useEdificeClient();
  const { t } = useTranslation(appCode);
  const { t: common_t } = useTranslation("common");
  const { usageMB, quotaMB, progress } = useMenuData();
  const setFilter = useDocumentListStore.use.setFilter();

  const menuItems: TreeItem[] = [
    {
      id: "inbox",
      name: t("rack.mine"),
    },
    {
      id: "deposits",
      name: t("rack.history"),
    },
    {
      id: "trash",
      name: t("rack.trash"),
    },
  ];

  const getIconForItem = (id: string) => {
    switch (id) {
      case "inbox":
        return <Inbox />;
      case "deposits":
        return <FolderOpen />;
      case "trash":
        return <Trash />;
      default:
        return null;
    }
  };

  const handleTreeItemClick = (nodeId: string) => {
    const filterMap: Record<string, DocumentFilter> = {
      inbox: "inbox",
      deposits: "deposits",
      trash: "trash",
    };
    setFilter(filterMap[nodeId] as DocumentFilter);
    navigate(`/${nodeId}`);
  };

  const getCurrentSelectedNodeId = (): string | null => {
    const pathToIdMap: Record<string, string> = {
      "/": "inbox",
      "/deposits": "deposits",
      "/trash": "trash",
    };
    return pathToIdMap[pathname] || null;
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
    <Menu label={t("rack.documents")}>
      <Menu.Item>
        <div className="desktop-menu-tree treeview">
          <Tree
            nodes={menuItems}
            selectedNodeId={getCurrentSelectedNodeId()}
            showIcon={false}
            renderNode={({ node }) => (
              <div className="d-flex align-items-center gap-8">
                {getIconForItem(node.id)}
                <span>{node.name}</span>
              </div>
            )}
            onTreeItemClick={handleTreeItemClick}
          />
        </div>
      </Menu.Item>
      <Menu.Item>
        <div className="w-100 border-bottom pt-8 mb-12"></div>
      </Menu.Item>
      <Menu.Item>
        <div className="d-flex flex-column gap-8">
          <b className="fs-6">{t("rack.usedSpace")}</b>
          <ProgressBar {...progressBarProps} />
        </div>
      </Menu.Item>
    </Menu>
  );
};
