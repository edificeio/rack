import { useState } from "react";

export const useUploadDocuments = () => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const handleFilesChange = (files: File[]) => {
    setUploadedFiles(files);
  };

  const clearFiles = () => {
    setUploadedFiles([]);
  };

  return {
    uploadedFiles,
    handleFilesChange,
    clearFiles,
  };
};
