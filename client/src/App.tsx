import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { PrinterProvider } from "./contexts/PrinterContext"; 
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { StoreProvider } from "./contexts/StoreContext";
import Home from "./pages/Home";
import StoreSetup from "./pages/StoreSetup";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Orders from "./pages/Orders";
import Reports from "./pages/Reports";
import StoreManagement from "./pages/StoreManagement";
import AIQuery from "./pages/AIQuery";
import MenuEditor from "./pages/MenuEditor";
import TableEditor from "./pages/TableEditor";
import StoreControl from "./pages/StoreControl";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/setup"} component={StoreSetup} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/pos"} component={POS} />
      <Route path={"/orders"} component={Orders} />
      <Route path={"/reports"} component={Reports} />
      <Route path={"/store-management"} component={StoreManagement} />
      <Route path={"/ai-query"} component={AIQuery} />
      <Route path={"/menu-editor"} component={MenuEditor} />
      <Route path={"/table-editor"} component={TableEditor} />
      <Route path={"/404"} component={NotFound} />
      <Route path={"/store-control"} component={StoreControl} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <StoreProvider>
          <PrinterProvider> {/* +++ 2. 在這裡用 PrinterProvider 包裹住 Router +++ */}
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
           </PrinterProvider>
        </StoreProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
