import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { AppLayout } from "@/routes/AppLayout";
import { HomePage } from "@/routes/HomePage";
import { InvitePage } from "@/routes/InvitePage";
import { LoginPage } from "@/routes/LoginPage";
import { PageDetail } from "@/routes/PageDetail";
import { RegisterPage } from "@/routes/RegisterPage";
import { TrashPage } from "@/routes/TrashPage";
import { useAuthStore } from "@/stores/auth.store";

const rootRoute = createRootRoute({ component: () => <Outlet /> });

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
  beforeLoad: () => {
    if (useAuthStore.getState().status === "authed") throw redirect({ to: "/" });
  },
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: RegisterPage,
  beforeLoad: () => {
    if (useAuthStore.getState().status === "authed") throw redirect({ to: "/" });
  },
});

// Publik: menangani link undangan email (auth ditangani di dalam komponen).
const inviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/invite",
  component: InvitePage,
});

// Layout terproteksi: redirect ke /login bila belum auth (route guard).
const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  component: AppLayout,
  beforeLoad: () => {
    if (useAuthStore.getState().status !== "authed") throw redirect({ to: "/login" });
  },
});

const indexRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/",
  component: HomePage,
});

const pageRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/p/$pageId",
  component: PageDetail,
});

const trashRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/trash",
  component: TrashPage,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  registerRoute,
  inviteRoute,
  appLayoutRoute.addChildren([indexRoute, pageRoute, trashRoute]),
]);

export const router = createRouter({ routeTree, defaultPreload: "intent" });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
