import { useTranslation } from "react-i18next";

export const NoRecipientItem = () => {
  const { t } = useTranslation();

  return (
    <div className="d-flex gap-8 align-items-center">
      <div className="p-8 d-flex flex-fill align-items-center gap-8">
        <span className="text-muted w-100 text-center">
          {t("rack.noRecipientsSelected")}
        </span>
      </div>
    </div>
  );
};
