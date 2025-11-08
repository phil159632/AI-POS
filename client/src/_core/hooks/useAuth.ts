// ==================================================
// 檔案 2/3: useAuth.js (修改後的完整程式碼)
// ==================================================

import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  // 當未登入時，我們不再跳轉到外部登入頁，而是留在首頁 '/'
  const { redirectOnUnauthenticated = false, redirectPath = "/" } =
    options ?? {};
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  // +++ 新增 +++
  // 用來處理 Google 登入的 tRPC Mutation
  const loginWithGoogleMutation = trpc.auth.loginWithGoogle.useMutation({
    onSuccess: () => {
      // 登入成功後，讓 meQuery 重新抓取最新的使用者資料
      utils.auth.me.invalidate();
    },
    onError: (error) => {
      console.error("Google 登入失敗:", error);
      alert(`登入失敗: ${error.message}`);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    if (meQuery.data) {
      localStorage.setItem(
        "manus-runtime-user-info",
        JSON.stringify(meQuery.data)
      );
    } else {
      localStorage.removeItem("manus-runtime-user-info");
    }
    
    return {
      user: meQuery.data ?? null,
      // 將 Google 登入的載入狀態也加進來
      loading: meQuery.isLoading || logoutMutation.isPending || loginWithGoogleMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? loginWithGoogleMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
    loginWithGoogleMutation.error,
    loginWithGoogleMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    
    if (window.location.pathname === redirectPath) return;

    window.location.replace(redirectPath);
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
    // +++ 新增 +++
    // 匯出函式，讓 Home.jsx 可以呼叫
    loginWithGoogle: loginWithGoogleMutation.mutateAsync,
  };
}
