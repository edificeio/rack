import {
  AppHeader,
  Breadcrumb,
  Grid,
  Layout,
  LoadingScreen,
  useBreakpoint,
  useEdificeClient,
} from "@edifice.io/react";
import { QueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  Outlet,
  useLoaderData,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { AppActionHeader } from "~/components/AppHeaderAction";
import actionsDefault, { Actions } from "~/config/Actions";
import configDefault, { Config } from "~/config/Config";
import { DesktopMenu } from "~/features/menu/components/DesktopMenu";
import { MobileMenu } from "~/features/menu/components/MobileMenu";
import { DeleteDocumentModal } from "~/features/modals/DeleteDocumentModal";
import { RestoreDocumentModal } from "~/features/modals/RestoreDocumentModal";
import { TrashDocumentModal } from "~/features/modals/TrashDocumentModal";
import { UploadDocumentModal } from "~/features/modals/UploadDocumentModal";
import { rackQueryOptions } from "~/services/queries/rack.queries";
import { useConfigStore } from "~/store/configStore";
import { useRackStore } from "~/store/rackStore";

type CollectFrontendModule = {
  CollectMenu: React.ComponentType<{ showMenu?: boolean; basePath?: string }>;
  CollectAppActionHeader: React.ComponentType<{ basePath?: string }>;
};

const CollectMenu = lazy(() =>
  (
    import("@edifice.io/collect-frontend/lib") as Promise<CollectFrontendModule>
  ).then((m) => ({
    default: m.CollectMenu,
  })),
);

const CollectAppActionHeader = lazy(() =>
  (
    import("@edifice.io/collect-frontend/lib") as Promise<CollectFrontendModule>
  ).then((m) => ({
    default: m.CollectAppActionHeader,
  })),
);

const COLLECT_ROUTE_CHANGE_EVENT = "collect:route-change";
const COLLECT_MENU_ALLOWED_ROUTES = new Set([
  "/collect",
  "/collect/list-collections",
  "/collect/list-submissions",
]);

const COLLECT_HEADER_ACTION_HIDDEN_ROUTES = [
  /^\/collect\/create\/(form|members)\/?$/,
  /^\/collect\/id\/[^/]+\/(form|members)\/?$/,
];

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
  const { lg } = useBreakpoint();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const pathnameRef = useRef(pathname);
  const { config, actions } = useLoaderData() as RootLoaderData;
  const openedModal = useRackStore.use.openedModal();

  // Fonction utilitaire pour calculer la visibilité basée sur le chemin
  const getVisibilityState = (path: string) => {
    const menuVisible = COLLECT_MENU_ALLOWED_ROUTES.has(path);
    const shouldHideHeaderAction = COLLECT_HEADER_ACTION_HIDDEN_ROUTES.some(
      (routePattern) => routePattern.test(path),
    );
    return {
      menuVisible,
      headerActionVisible: !shouldHideHeaderAction,
    };
  };

  const initialState = getVisibilityState(pathname);
  const [isCollectMenuVisible, setIsCollectMenuVisible] = useState(
    initialState.menuVisible,
  );

  const isCollectRoute = useMemo(
    () => pathname === "/collect" || pathname.startsWith("/collect/"),
    [pathname],
  );

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const onCollectRouteChange = (event: Event) => {
      const detail = (event as CustomEvent<{ path?: string }>).detail;
      const path = detail?.path ?? "/";
      const browserPath = path === "/" ? "/collect" : `/collect${path}`;

      const visibilityState = getVisibilityState(browserPath);
      setIsCollectMenuVisible(visibilityState.menuVisible);

      if (pathnameRef.current !== browserPath) {
        navigate(browserPath, { replace: true });
      }
    };

    window.addEventListener(COLLECT_ROUTE_CHANGE_EVENT, onCollectRouteChange);

    return () => {
      window.removeEventListener(
        COLLECT_ROUTE_CHANGE_EVENT,
        onCollectRouteChange,
      );
    };
  }, []); // Pas de dépendances - le listener reste stable

  const shouldShowDesktopMenu = !isCollectRoute || isCollectMenuVisible;

  const HeaderAction = () => {
    if (!shouldShowDesktopMenu) {
      return null;
    }

    return (
      <>
        <AppActionHeader />
        <Suspense fallback={null}>
          <CollectAppActionHeader basePath="/collect" />
        </Suspense>
      </>
    );
  };

  if (!init || !currentApp) {
    return <LoadingScreen position={false} />;
  }

  if (!config || !actions) {
    throw new Error("Configuration failed to load");
  }

  return (
    <div className="d-flex flex-column min-vh-100 flex-grow-1">
      <Layout className={`${lg ? "" : "p-0"} d-flex flex-column flex-grow-1`}>
        {/* Header - not printed */}
        <div className={`d-print-none ${!lg ? "mx-16" : ""}`}>
          <AppHeader render={HeaderAction}>
            <Breadcrumb app={currentApp} />
          </AppHeader>
        </div>

        {/* Main content area */}
        <Grid className="flex-grow-1">
          {shouldShowDesktopMenu && (
            <Grid.Col
              sm="3"
              md="3"
              lg="2"
              xl="3"
              className="d-none d-lg-block"
              as="aside"
            >
              <Suspense fallback={null}>
                <CollectMenu showMenu={false} basePath="/collect" />
              </Suspense>
              <DesktopMenu />
            </Grid.Col>
          )}
          <Grid.Col
            sm="4"
            md="8"
            lg={shouldShowDesktopMenu ? "6" : "12"}
            xl={shouldShowDesktopMenu ? "9" : "12"}
            className={`${lg ? "cancel-gap" : ""} d-flex flex-column`}
          >
            {!lg && <MobileMenu />}
            <Suspense fallback={<LoadingScreen />}>
              <Outlet
                context={{
                  config,
                  actions,
                }}
              />
            </Suspense>
          </Grid.Col>
        </Grid>

        {/* Modals */}
        {openedModal === "upload" && <UploadDocumentModal />}
        <DeleteDocumentModal />
        <RestoreDocumentModal />
        <TrashDocumentModal />
      </Layout>
    </div>
  );
}
