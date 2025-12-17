import { Button, Avatar } from "@edifice.io/react";
import { IconClose } from "@edifice.io/react/icons";
import { useTranslation } from "react-i18next";
import type { Recipient } from "../hooks/useUploadSearch";
import groupAvatar from "~/assets/images/group-avatar.svg";

interface SelectedRecipientItemProps {
  recipient: Recipient;
  onRemove: (id: string, type: "user" | "group") => void;
}

export const SelectedRecipientItem = ({
  recipient,
  onRemove,
}: SelectedRecipientItemProps) => {
  const { t } = useTranslation();

  return (
    <div className="d-flex gap-8 align-items-center p-8 px-16">
      <div className="d-flex flex-fill align-items-center gap-8">
        {/* Avatar */}
        {recipient.type === "user" ? (
          <Avatar
            src={`/avatar/${recipient.id}?thumbnail=100x100`}
            alt={recipient.name}
            variant="circle"
            size="sm"
          />
        ) : (
          <Avatar
            variant="circle"
            size="sm"
            className="bg-secondary-200 p-4"
            alt={recipient.name}
            src={groupAvatar}
          />
        )}

        {/* Name and Type */}
        <div className="d-flex flex-column small flex-fill">
          <strong>{recipient.name}</strong>
        </div>
      </div>

      {/* Remove Button */}
      <Button
        type="button"
        color="tertiary"
        variant="ghost"
        rightIcon={<IconClose />}
        onClick={() => onRemove(recipient.id, recipient.type)}
        aria-label={t("remove")}
      />
    </div>
  );
};
