// ==================================================
// 檔案：Home.jsx (最終修改後的完整程式碼)
// ==================================================

import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2, Store } from "lucide-react";
import { APP_TITLE } from "@/const"; // 確保 getLoginUrl 已從此檔案的 import 中移除
import { useLocation } from "wouter";
import { useEffect } from "react";

// 引入我們新安裝的 Google 登入函式庫
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

export default function Home() {
  // 從 useAuth 取得我們需要的狀態和新的函式 loginWithGoogle
  const { user, loading, isAuthenticated, loginWithGoogle } = useAuth();
  const [, setLocation] = useLocation();

  // 監聽登入狀態，一旦成功登入就自動跳轉
  useEffect(() => {
    if (isAuthenticated && user) {
      // 已登入,導向店家設置頁面
      setLocation("/setup");
    }
  }, [isAuthenticated, user, setLocation]);

  // 從 .env 環境變數檔案讀取 Google Client ID
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // 如果正在載入使用者狀態 (例如，正在驗證 cookie)，顯示讀取動畫
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // 如果 Client ID 未設定，顯示明確的錯誤訊息 (這是非常重要的保護措施)
  if (!googleClientId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center p-8 bg-white shadow-md rounded-lg">
          <h2 className="text-2xl font-bold text-red-600">設定錯誤</h2>
          <p className="text-gray-700 mt-2">
            Google 登入功能尚未正確設定。
          </p>
          <p className="text-sm text-gray-500 mt-1">
            (錯誤：缺少 VITE_GOOGLE_CLIENT_ID 環境變數)
          </p>
        </div>
      </div>
    );
  }

  // 主渲染畫面
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6">
        {/* Logo & Title */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
              <Store className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{APP_TITLE}</h1>
          <p className="text-gray-600">智能餐飲管理系統</p>
        </div>

        {/* Features */}
        <div className="space-y-3 py-4">
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
            <p className="text-sm text-gray-700">多店家管理,支援店長與店員角色</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
            <p className="text-sm text-gray-700">智能點餐系統,即時訂單追蹤</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
            <p className="text-sm text-gray-700">AI數據分析,營運報表一目了然</p>
          </div>
        </div>

        {/* 全新的 Google 登入按鈕區塊 */}
        <div className="pt-4">
          <GoogleOAuthProvider clientId={googleClientId}>
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={async (credentialResponse) => {
                  console.log("Google 登入成功，正在將憑證送往後端處理...", credentialResponse);
                  if (credentialResponse.credential) {
                    // 登入成功後，呼叫 useAuth 中的函式來觸發後端驗證
                    await loginWithGoogle({ token: credentialResponse.credential });
                    // 成功後，上面的 useEffect 會自動監聽到狀態變化並觸發頁面跳轉
                  } else {
                    console.error("Google 登入成功，但未收到 credential。");
                    alert("登入時發生預期外的錯誤，請重試。");
                  }
                }}
                onError={() => {
                  console.error('Google 登入失敗');
                  alert("Google 登入失敗，請檢查瀏覽器 Console 中的錯誤訊息。");
                }}
                locale="zh-TW" // 設定按鈕語言為繁體中文
                theme="outline"
                size="large"
                shape="rectangular"
                width="320px" // 讓按鈕寬度與您的設計更匹配
              />
            </div>
          </GoogleOAuthProvider>
        </div>

        <p className="text-xs text-center text-gray-500">
          登入即表示您同意我們的服務條款與隱私政策
        </p>
      </div>
    </div>
  );
}
