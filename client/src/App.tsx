import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";

// Pages
import Home from "./pages/Home";
import Wiki from "./pages/Wiki";
import WikiCategory from "./pages/WikiCategory";
import WikiArticle from "./pages/WikiArticle";
import WikiEditor from "./pages/WikiEditor";
import SOPs from "./pages/SOPs";
import SOPView from "./pages/SOPView";
import SOPEditor from "./pages/SOPEditor";
import Search from "./pages/Search";
import Chat from "./pages/Chat";
import Notifications from "./pages/Notifications";

// Admin Pages
import AdminCategories from "./pages/admin/Categories";
import AdminUsers from "./pages/admin/Users";
import AdminSettings from "./pages/admin/Settings";
import AdminFeedback from "./pages/admin/Feedback";
import AdminReviews from "./pages/admin/Reviews";
import AdminAuditLog from "./pages/admin/AuditLog";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        {/* Main Routes */}
        <Route path="/" component={Home} />
        <Route path="/wiki" component={Wiki} />
        <Route path="/wiki/category/:slug" component={WikiCategory} />
        <Route path="/wiki/article/:slug" component={WikiArticle} />
        <Route path="/wiki/new" component={WikiEditor} />
        <Route path="/wiki/edit/:slug" component={WikiEditor} />
        
        {/* SOP Routes */}
        <Route path="/sops" component={SOPs} />
        <Route path="/sops/view/:slug" component={SOPView} />
        <Route path="/sops/new" component={SOPEditor} />
        <Route path="/sops/edit/:slug" component={SOPEditor} />
        
        {/* Other Routes */}
        <Route path="/search" component={Search} />
        <Route path="/chat" component={Chat} />
        <Route path="/notifications" component={Notifications} />
        
        {/* Admin Routes */}
        <Route path="/admin/categories" component={AdminCategories} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/settings" component={AdminSettings} />
        <Route path="/admin/feedback" component={AdminFeedback} />
        <Route path="/admin/reviews" component={AdminReviews} />
        <Route path="/admin/audit-log" component={AdminAuditLog} />
        
        {/* Fallback */}
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
