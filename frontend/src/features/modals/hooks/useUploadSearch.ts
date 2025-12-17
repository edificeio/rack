import { useState, useCallback } from "react";
import { useSearchUsers } from "~/services/queries/rack.queries";
import { odeServices } from "@edifice.io/client";
import { useIsAdmlcOrAdmc, type OptionListItemType } from "@edifice.io/react";

export interface Recipient {
  id: string;
  name: string;
  profile?: string;
  type: "user" | "group";
}

export const useUploadSearch = () => {
  const { isAdmlcOrAdmc } = useIsAdmlcOrAdmc();
  const [searchInputValue, setSearchInputValue] = useState<string>("");
  const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>([]);

  const searchMinLength = isAdmlcOrAdmc ? 1 : 3;

  const { data, isLoading: isSearchLoading } = useSearchUsers(
    searchInputValue,
    searchMinLength,
  );
  const removeAccents = odeServices.idiom().removeAccents;
  const searchTerm = removeAccents(searchInputValue).toLowerCase();

  const userSearchResults: OptionListItemType[] = (data?.users || [])
    .filter((user) =>
      removeAccents(user.username).toLowerCase().includes(searchTerm),
    )
    .map((user) => ({
      value: user.id,
      label: user.username,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const groupSearchResults: OptionListItemType[] = (data?.groups || [])
    .filter((group) =>
      removeAccents(group.name).toLowerCase().includes(searchTerm),
    )
    .map((group) => ({
      value: group.id,
      label: group.name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const searchResults = [...userSearchResults, ...groupSearchResults];
  const hasSearchNoResults =
    searchInputValue.length >= searchMinLength &&
    !isSearchLoading &&
    (!searchResults || searchResults.length === 0);

  const handleSearchInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchInputValue(e.target.value);
    },
    [],
  );

  const handleAddRecipient = useCallback(
    (userId: string) => {
      const user = (data?.users || []).find((u) => u.id === userId);
      const group = (data?.groups || []).find((g) => g.id === userId);
      if (user || group) {
        setSelectedRecipients((prev) => {
          if (!prev.some((recipient) => recipient.id === userId)) {
            return [
              ...prev,
              user
                ? {
                    id: user.id,
                    name: user.displayName || user.username,
                    profile: user.profile,
                    type: "user",
                  }
                : {
                    id: group!.id,
                    name: group!.name,
                    type: "group",
                  },
            ];
          }
          return prev;
        });
        setSearchInputValue("");
      }
    },
    [data, setSelectedRecipients, setSearchInputValue],
  );

  const handleRemoveRecipient = useCallback((userId: string) => {
    setSelectedRecipients((prev) =>
      prev.filter((recipient) => recipient.id !== userId),
    );
  }, []);

  return {
    searchInputValue,
    searchResults: (searchResults as OptionListItemType[]) || [],
    isSearchLoading,
    hasSearchNoResults,
    searchMinLength,
    selectedRecipients,
    handleSearchInputChange,
    handleAddRecipient,
    handleRemoveRecipient,
  };
};
