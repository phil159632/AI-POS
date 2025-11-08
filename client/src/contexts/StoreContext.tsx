import React, { createContext, useContext, useState, useEffect } from "react";

interface StoreContextType {
  selectedStoreId: number | null;
  setSelectedStoreId: (storeId: number | null) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

interface StoreProviderProps {
  children: React.ReactNode;
}

export function StoreProvider({ children }: StoreProviderProps) {
  const [selectedStoreId, setSelectedStoreIdState] = useState<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 初始化時從localStorage讀取
  useEffect(() => {
    const stored = localStorage.getItem("selectedStoreId");
    if (stored) {
      setSelectedStoreIdState(Number(stored));
    }
    setIsInitialized(true);
  }, []);

  // 當selectedStoreId變化時，保存到localStorage
  const setSelectedStoreId = (storeId: number | null) => {
    setSelectedStoreIdState(storeId);
    if (storeId !== null) {
      localStorage.setItem("selectedStoreId", storeId.toString());
    } else {
      localStorage.removeItem("selectedStoreId");
    }
  };

  return (
    <StoreContext.Provider value={{ selectedStoreId, setSelectedStoreId }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within StoreProvider");
  }
  return context;
}
