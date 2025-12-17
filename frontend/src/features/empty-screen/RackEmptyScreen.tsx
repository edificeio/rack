import { EmptyScreen, Heading, useEdificeClient } from "@edifice.io/react";
import { useTranslation } from "react-i18next";
import emptyRackImage from "~/assets/images/empty-rack.svg";

/**
 * Empty screen for Rack when casier is empty
 */
export const RackEmptyScreen = () => {
  const { appCode } = useEdificeClient();
  const { t } = useTranslation(appCode);
  const emptyStyles = { maxWidth: "424px" };

  return (
    <div
      className="d-flex flex-column gap-24 flex-fill align-items-center justify-content-center m-auto"
      style={emptyStyles}
    >
      <EmptyScreen imageSrc={emptyRackImage} imageAlt="Empty Rack" />
      <Heading className="text-secondary mb-16 text-center" level="h2">
        {t("rack.empty.title")}
      </Heading>
      <p className="text-center">{t("rack.empty.text")}</p>
    </div>
  );
};
