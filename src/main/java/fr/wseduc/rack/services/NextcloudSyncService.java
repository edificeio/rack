package fr.wseduc.rack.services;

public interface NextcloudSyncService {
    /**
     * Starts a periodic synchronization process for Nextcloud.
     * It will run at an interval defined in the conf by the key "nextcloud-sync-delay".
     * The default value is 10 minutes.
     */
    void startPeriodicSync();
}
