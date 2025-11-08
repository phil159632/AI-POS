import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft, Brain, Send, Sparkles, Zap, X, Copy, Share2, Check } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AIQuery() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
      return;
    }
    const storedStoreId = localStorage.getItem("selectedStoreId");
    if (storedStoreId) {
      setSelectedStoreId(Number(storedStoreId));
    }

    // 初始歡迎訊息
    setMessages([
      {
        role: "assistant",
        content: "您好!我是AI助手,可以幫您查詢店內數據。您可以問我:\n\n- 本月最暢銷的品項是什麼?\n- 近一週的營業額是多少?\n- 今天有多少訂單?\n- 哪些品項最受歡迎?\n\n請隨時提問!"
      }
    ]);
  }, [isAuthenticated, setLocation]);

  const aiQueryMutation = trpc.ai.query.useMutation({
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.response
      }]);
      setIsLoading(false);
      abortControllerRef.current = null;
    },
    onError: (error) => {
      toast.error(error.message || "查詢失敗");
      setIsLoading(false);
      abortControllerRef.current = null;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedStoreId) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    // 創建新的 AbortController
    abortControllerRef.current = new AbortController();

    aiQueryMutation.mutate({
      storeId: selectedStoreId,
      query: userMessage,
    });
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    toast.info("已取消查詢");
  };

  const handleCopy = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      toast.success("已複製到剪貼簿");
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      toast.error("複製失敗");
    }
  };

  const handleShare = async (content: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "AI 分析結果",
          text: content,
        });
      } catch (error) {
        // 用戶取消分享或不支持
        console.log("分享已取消");
      }
    } else {
      // 降級方案：複製到剪貼簿
      await navigator.clipboard.writeText(content);
      toast.success("已複製到剪貼簿（瀏覽器不支持分享功能）");
    }
  };

  const quickQuestions = [
    "今天的營業額是多少?",
    "本月最暢銷的品項?",
    "近7天的訂單數量?",
    "現金收入佔比多少?",
  ];

  const handleQuickQuestion = (question: string) => {
    setInput(question);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => setLocation("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Brain className="w-6 h-6 mr-2 text-purple-600" />
                AI 智能查詢
              </h1>
              <p className="text-sm text-gray-500">用自然語言查詢店內數據</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <Card className="h-[calc(100vh-200px)] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
              對話介面
            </CardTitle>
            <CardDescription>
              直接用自然語言提問,AI會幫您分析店內數據
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col overflow-hidden">
            {/* 訊息區域 */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className="flex flex-col max-w-[80%]">
                    <div
                      className={`rounded-lg p-4 relative ${
                        msg.role === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      {/* 複製和分享按鈕 - 顯示在 AI 回復右上角 */}
                      {msg.role === "assistant" && index > 0 && (
                        <div className="absolute top-2 right-2 flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                            onClick={() => handleCopy(msg.content, index)}
                            title="複製內容"
                          >
                            {copiedIndex === index ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                            onClick={() => handleShare(msg.content)}
                            title="分享內容"
                          >
                            <Share2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none pr-16">
                          <style>{`
                            .prose strong {
                              color: #7c3aed;
                              font-weight: 600;
                            }
                            .prose h3 {
                              color: #7c3aed;
                              font-weight: 700;
                              margin-top: 1rem;
                              margin-bottom: 0.5rem;
                            }
                            .prose table th {
                              background-color: #f3f4f6;
                              font-weight: 600;
                            }
                            .prose table td:first-child {
                              font-weight: 500;
                            }
                            .prose code {
                              color: #059669;
                              background-color: #f0fdf4;
                              padding: 0.125rem 0.25rem;
                              border-radius: 0.25rem;
                              font-weight: 500;
                            }
                          `}</style>
                          <Streamdown>{msg.content}</Streamdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200 shadow-sm">
                    <div className="flex items-center justify-between space-x-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Zap className="w-4 h-4 text-purple-600 animate-pulse" />
                          <span className="text-sm text-purple-600 font-medium">AI正在分析數據中...</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={handleCancel}
                      >
                        <X className="w-4 h-4 mr-1" />
                        取消
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 快速問題 */}
            {messages.length === 1 && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-2">快速提問:</p>
                <div className="grid grid-cols-2 gap-2">
                  {quickQuestions.map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-left justify-start h-auto py-2"
                      onClick={() => handleQuickQuestion(question)}
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* 輸入區域 */}
            <form onSubmit={handleSubmit} className="flex space-x-2">
              <Input
                placeholder="輸入您的問題..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || !input.trim()}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
