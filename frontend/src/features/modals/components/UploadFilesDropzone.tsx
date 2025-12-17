import { ImageEditor, UploadCard } from "@edifice.io/react";
import { customSize } from "@edifice.io/utilities";
import { useDropzoneContext } from "@edifice.io/react";
import { useEffect, useRef, useState, useCallback } from "react";

interface UploadFilesDropzoneProps {
  onFilesChange: (files: File[]) => void;
}

export const UploadFilesDropzone = ({
  onFilesChange,
}: UploadFilesDropzoneProps) => {
  const { files, deleteFile, replaceFileAt } = useDropzoneContext();

  const fileBlobs = useRef(new Map<string, string>());
  const [editingImage, setEditingImage] = useState<File | null>(null);

  useEffect(() => {
    onFilesChange(files);
  }, [files, onFilesChange]);

  useEffect(() => {
    const blobs = fileBlobs.current;
    return () => {
      blobs.forEach((url) => URL.revokeObjectURL(url));
      blobs.clear();
    };
  }, []);

  const isTypeImage = (type: string) => type.startsWith("image");

  const renderItem = (file: File) => {
    const isImage = isTypeImage(file.type);

    if (!fileBlobs.current.has(file.name)) {
      fileBlobs.current.set(file.name, URL.createObjectURL(file));
    }

    const src = isImage ? fileBlobs.current.get(file.name) || "" : "";

    return {
      name: file.name,
      info: {
        type: file.type,
        weight: customSize(file.size || 0, 1),
      },
      src,
    };
  };

  const handleRemoveFile = (file: File) => {
    const blobUrl = fileBlobs.current.get(file.name);
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      fileBlobs.current.delete(file.name);
    }
    deleteFile(file);
  };

  const handleEdit = (file: File) => {
    setEditingImage(file);
  };

  const getUrl = useCallback((file: File) => {
    if (!fileBlobs.current.has(file.name)) {
      fileBlobs.current.set(file.name, URL.createObjectURL(file));
    }
    return fileBlobs.current.get(file.name) || "";
  }, []);

  const updateImage = async ({
    blob,
  }: {
    blob: Blob;
    legend: string;
    altText: string;
  }) => {
    if (!editingImage) return;
    const newFile = new File([blob], editingImage.name, { type: blob.type });
    const index = files.findIndex((f) => f.name === editingImage.name);
    if (index !== -1) {
      replaceFileAt(index, newFile);
      const oldBlobUrl = fileBlobs.current.get(editingImage.name);
      if (oldBlobUrl) {
        URL.revokeObjectURL(oldBlobUrl);
        fileBlobs.current.delete(editingImage.name);
      }
      fileBlobs.current.set(newFile.name, URL.createObjectURL(newFile));
    }
    setEditingImage(null);
  };

  return (
    <>
      {/* Upload Cards */}
      {files.length > 0 && (
        <div className="d-flex flex-column gap-8">
          {files.map((file) => {
            const item = renderItem(file);

            return (
              <UploadCard
                key={file.name}
                item={item}
                status="success"
                onEdit={() => handleEdit(file)}
                onDelete={() => handleRemoveFile(file)}
              />
            );
          })}

          {/* ImageEditor */}
          {editingImage && (
            <ImageEditor
              altText={editingImage.name}
              legend={editingImage.name}
              image={getUrl(editingImage)}
              isOpen={!!editingImage}
              onCancel={() => setEditingImage(null)}
              onSave={updateImage}
              onError={console.error}
            />
          )}
        </div>
      )}
    </>
  );
};
