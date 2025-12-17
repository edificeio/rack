import { useEdificeClient } from "@edifice.io/react";
import { IQuotaAndUsage } from "@edifice.io/client";

/**
 * Custom hook to retrieve menu data including quota and usage information.
 *
 * This hook uses the `useEdificeClient` hook to get the client instance and session query.
 * If the client is not initialized, it returns default values.
 * Otherwise, it extracts the quota and usage information from the session query data.
 *
 * @returns An object containing usage, quota, and formatted values in MB
 * @property {number} usage - The amount of space used, in bytes
 * @property {number} quota - The total quota available, in bytes
 * @property {number} usageMB - The amount of space used, in megabytes
 * @property {number} quotaMB - The total quota available, in megabytes
 * @property {number} progress - The usage progress as a percentage (0-100)
 */
export const useMenuData = () => {
  const { init, sessionQuery } = useEdificeClient();

  // Default values if client is not initialized
  if (!init || !sessionQuery?.data) {
    return {
      usage: 0,
      quota: 0,
      usageMB: 0,
      quotaMB: 0,
      progress: 0,
    };
  }

  // Extract quota and usage from session data
  const quotaAndUsage = sessionQuery.data.quotaAndUsage as IQuotaAndUsage;
  const usage = quotaAndUsage?.storage || 0;
  const quota = quotaAndUsage?.quota || 0;

  // Convert bytes to megabytes
  const bytesToMegabytes = (bytes: number) => Math.round(bytes / (1024 * 1024));

  // Calculate progress percentage
  const progress = quota > 0 ? (usage * 100) / quota : 0;

  return {
    usage,
    quota,
    usageMB: bytesToMegabytes(usage),
    quotaMB: bytesToMegabytes(quota),
    progress,
  };
};
