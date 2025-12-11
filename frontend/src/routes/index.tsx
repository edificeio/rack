import { QueryClient } from "@tanstack/react-query";
import { RouteObject, createBrowserRouter } from "react-router-dom";

// Import your main pages and features here
import { NotFound } from "../pages/NotFound"; // 404 page component
// Example: import FeaturePage from "../features/FeaturePage";

// Example of lazy loading a feature (uncomment and use as needed)
// const FeaturePage = React.lazy(() => import("../features/FeaturePage"));

/**
 * Main route configuration for the application.
 * Extend this array with your own routes and features.
 * The queryClient is available for advanced data loading (React Query).
 */
const routes = (queryClient: QueryClient): RouteObject[] => [
  {
    path: "/",
    async lazy() {
      // Example of lazy loading with queryClient
      const { loader, Root: Component } = await import("../pages/Home");
      return {
        loader: loader ? loader(queryClient) : undefined,
        Component,
      };
    },
    // errorElement: <PageError />, // Add a global error page if needed
    children: [
      // Add your sub-routes here
      // Example:
      // {
      //   path: "feature",
      //   async lazy() {
      //     const { loader, Component } = await import("../features/FeaturePage");
      //     return {
      //       loader: loader(queryClient),
      //       Component,
      //     };
      //   },
      // },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

// The base URL for the router, usually set via Vite config
export const basename = import.meta.env.BASE_URL;

/**
 * Creates the browser router instance for the app.
 * Pass the queryClient for data-aware routes.
 */
export const router = (queryClient: QueryClient) =>
  createBrowserRouter(routes(queryClient), {
    basename,
  });
