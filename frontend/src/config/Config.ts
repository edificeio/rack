/**
 * Application configuration
 * Contains static configuration for the Rack application
 */
export interface Config {
  app: {
    name: string;
    displayName: string;
    version: string;
  };
  api: {
    baseUrl: string;
    timeout: number;
  };
  upload: {
    maxFileSize: number; // in bytes
    maxFiles: number;
    allowedMimeTypes: string[];
  };
  pagination: {
    itemsPerPage: number;
  };
}

const config: Config = {
  app: {
    name: "rack",
    displayName: "Rack",
    version: import.meta.env.VITE_APP_VERSION || "1.0.0",
  },
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || "/rack",
    timeout: 30000,
  },
  upload: {
    maxFileSize: 100 * 1024 * 1024, // 100 MB
    maxFiles: 10,
    allowedMimeTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "image/*",
    ],
  },
  pagination: {
    itemsPerPage: 10,
  },
};

export default config;
