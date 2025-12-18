import { EmptyScreen, Heading, useEdificeClient } from "@edifice.io/react";
import { useTranslation } from "react-i18next";
import emptyTrashImage from "~/assets/images/empty-trash.svg";

/**
 * Empty screen for Trash when it's empty
 */
export const TrashEmptyScreen = () => {
  const { appCode } = useEdificeClient();
  const { t } = useTranslation(appCode);
  const emptyStyles = { maxWidth: "500px" };

  return (
    <div
      className="d-flex flex-column gap-24 flex-fill align-items-center justify-content-center m-auto"
      style={emptyStyles}
    >
      <EmptyScreen imageSrc={emptyTrashImage} imageAlt="Empty Trash" />
      <Heading className="text-secondary mb-16 text-center" level="h2">
        {t("rack.trash.empty.title")}
      </Heading>
      <p className="text-center">{t("rack.trash.empty.text")}</p>
    </div>
  );
};
