// api/trpc.js
import { appRouter } from "../server/routers"; // 根據您的專案結構調整路徑
import { createTRPCContext } from "../server/trpc"; // 根據您的專案結構調整路徑
import { createNextApiHandler } from "@trpc/server/adapters/next";

export default createNextApiHandler({
  router: appRouter,
  createContext: createTRPCContext,
});
