import { Fragment } from "react";
import {
  Modal,
  Button,
  useEdificeClient,
  Combobox,
  Dropzone,
} from "@edifice.io/react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { useUploadActions } from "./hooks/useUploadActions";
import { UploadFilesDropzone } from "./components/UploadFilesDropzone";
import { SelectedRecipientItem } from "./components/SelectedRecipientItem";
import { NoRecipientItem } from "./components/NoRecipientItem";

const acceptedTypes = () => ["*"];

export const UploadDocumentModal = () => {
  const { appCode } = useEdificeClient();
  const { t } = useTranslation(appCode);

  const {
    searchInputValue,
    searchResults,
    isSearchLoading,
    hasSearchNoResults,
    searchMinLength,
    handleSearchInputChange,
    handleAddRecipient,
    isFormValid,
    handleFilesChange,
    selectedRecipients,
    handleRemoveRecipient,
    handleSubmit,
    handleClose,
    isLoading,
  } = useUploadActions();

  return createPortal(
    <Modal
      isOpen={true}
      onModalClose={handleClose}
      id="upload-document-modal"
      size="lg"
    >
      <Modal.Header onModalClose={handleClose}>{t("rack.upload")}</Modal.Header>

      <Modal.Body>
        <div className="d-flex flex-column gap-24">
          {/* Files Upload Section */}
          <div>
            <label className="fw-bold mb-8">{t("rack.selectFiles")}</label>
            <Dropzone multiple accept={acceptedTypes()}>
              <UploadFilesDropzone onFilesChange={handleFilesChange} />
            </Dropzone>
          </div>

          {/* Recipients Section */}
          <div>
            <label className="fw-bold mb-8">{t("rack.selectRecipients")}</label>

            <Combobox
              data-testid="rack-upload-recipients-search"
              value={searchInputValue}
              placeholder={t("rack.search.recipients")}
              isLoading={isSearchLoading}
              noResult={hasSearchNoResults}
              options={searchResults}
              searchMinLength={searchMinLength}
              onSearchInputChange={handleSearchInputChange}
              onSearchResultsChange={(values) => {
                if (values.length > 0) {
                  handleAddRecipient(values[0].toString());
                }
              }}
              renderListItem={(option) => (
                <div className="d-flex align-items-center gap-8">
                  <span>{option.label}</span>
                </div>
              )}
            />

            {/* Selected Recipients List */}
            {selectedRecipients.length >= 0 && (
              <div className="bg-white rounded-4 py-8 mt-24 border">
                {selectedRecipients.length > 0 ? (
                  selectedRecipients.map((recipient, index) => (
                    <Fragment key={`${recipient.type}-${recipient.id}`}>
                      <SelectedRecipientItem
                        recipient={recipient}
                        onRemove={handleRemoveRecipient}
                      />
                      {index < selectedRecipients.length - 1 && (
                        <hr className="my-8" />
                      )}
                    </Fragment>
                  ))
                ) : (
                  <NoRecipientItem />
                )}
              </div>
            )}
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button
          type="button"
          color="tertiary"
          variant="ghost"
          onClick={handleClose}
        >
          {t("rack.cancel")}
        </Button>
        <Button
          type="button"
          color="primary"
          onClick={handleSubmit}
          disabled={!isFormValid || isLoading}
          isLoading={isLoading}
        >
          {t("rack.upload")}
        </Button>
      </Modal.Footer>
    </Modal>,
    document.getElementById("portal") as HTMLElement,
  );
};
