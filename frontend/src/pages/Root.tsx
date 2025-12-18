import {
  AppHeader,
  Breadcrumb,
  Layout,
  LoadingScreen,
  useEdificeClient,
  useBreakpoint,
} from "@edifice.io/react";
import { QueryClient } from "@tanstack/react-query";
import { Suspense } from "react";
import { Outlet, useLoaderData } from "react-router-dom";
import {
  rackQueryOptions,
  useRackDocuments,
} from "~/services/queries/rack.queries";
import { UploadDocumentModal } from "~/features/modals/UploadDocumentModal";
import { DeleteDocumentModal } from "~/features/modals/DeleteDocumentModal";
import { RestoreDocumentModal } from "~/features/modals/RestoreDocumentModal";
import { useRackStore } from "~/store/rackStore";
import { useConfigStore } from "~/store/configStore";
import { AppActionHeader } from "~/components/AppHeaderAction";
import { DesktopMenu } from "~/features/menu/components/DesktopMenu";
import { MobileMenu } from "~/features/menu/components/MobileMenu";
import { Config } from "~/config/Config";
import { Actions } from "~/config/Actions";
import configDefault from "~/config/Config";
import actionsDefault from "~/config/Actions";
import { TrashDocumentModal } from "~/features/modals/TrashDocumentModal";
import { RackEmptyScreen } from "~/features/empty-screen";

/**
 * Root loader data interface
 * Contains global configuration and preloaded data for the Rack application
 */
export interface RootLoaderData {
  config: Config;
  actions: Actions;
}

/**
 * Loader function for the root route
 * Preloads configuration, actions, and initial documents data
 * Stores configuration in global store for accessibility throughout the app
 */
export function loader(queryClient: QueryClient) {
  return async (): Promise<RootLoaderData> => {
    try {
      // Preload documents for immediate availability
      await queryClient.ensureQueryData(rackQueryOptions.getDocuments());

      // Get store instance and persist config/actions
      const setConfig = useConfigStore.getState().setConfig;
      const setActions = useConfigStore.getState().setActions;

      // Set config and actions in store
      setConfig(configDefault);
      setActions(actionsDefault);

      return {
        config: configDefault,
        actions: actionsDefault,
      };
    } catch (error) {
      console.error("Error loading root data:", error);

      // Return default values if loading fails
      const setConfig = useConfigStore.getState().setConfig;
      const setActions = useConfigStore.getState().setActions;

      setConfig(configDefault);
      setActions(actionsDefault);

      return {
        config: configDefault,
        actions: actionsDefault,
      };
    }
  };
}

/**
 * Root component for the Rack application
 * Provides the main layout with header, content area, and modals
 */
export function Component() {
  const { init, currentApp } = useEdificeClient();
  const { md } = useBreakpoint();
  const { config, actions } = useLoaderData() as RootLoaderData;
  const openedModal = useRackStore.use.openedModal();
  const { data: documents, isLoading } = useRackDocuments();

  // Show loading screen while initializing
  if (!init || !currentApp) {
    return <LoadingScreen position={false} />;
  }

  if (!config || !actions) {
    throw new Error("Configuration failed to load");
  }

  const hasDocuments = !isLoading && documents && documents.length > 0;

  return (
    <div className="d-flex flex-column vh-100 flex-grow-1">
      <Layout className={md ? "" : "p-0"}>
        {/* Header - not printed */}
        <div className="d-print-none mx-16">
          <AppHeader render={AppActionHeader}>
            <Breadcrumb app={currentApp} />
          </AppHeader>
        </div>

        {/* Main content area */}
        <div
          className={`d-flex overflow-x-hidden flex-grow-1 ${
            md ? "" : "flex-column"
          }`}
        >
          {/* Desktop Menu */}
          {md && (
            <div className="d-none d-md-block" style={{ width: "280px" }}>
              <DesktopMenu />
            </div>
          )}

          {/* Mobile Menu */}
          {!md && <MobileMenu />}

          <div className="flex-grow-1 overflow-y-auto">
            {!hasDocuments && !isLoading ? (
              <RackEmptyScreen />
            ) : (
              <Suspense fallback={<LoadingScreen />}>
                <Outlet
                  context={{
                    config,
                    actions,
                  }}
                />
              </Suspense>
            )}
          </div>
        </div>

        {/* Modals */}
        {openedModal === "upload" && <UploadDocumentModal />}
        <DeleteDocumentModal />
        <RestoreDocumentModal />
        <TrashDocumentModal />
      </Layout>
    </div>
  );
}
