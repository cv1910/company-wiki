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
import SOPCategory from "./pages/SOPCategory";
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
import AdminAnnouncements from "./pages/admin/Announcements";
import AdminAssignments from "./pages/admin/Assignments";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminVerification from "./pages/admin/Verification";

// Leave/Vacation Pages
import Leave from "./pages/Leave";
import AdminLeave from "./pages/admin/Leave";
import AdminLeaveBalances from "./pages/admin/LeaveBalances";

// Settings & Mentions
import EmailSettings from "./pages/EmailSettings";
import Mentions from "./pages/Mentions";

// Onboarding
import Onboarding from "./pages/Onboarding";

// Calendar
import Calendar from "./pages/Calendar";
import CalendarSettings from "./pages/CalendarSettings";

// Scheduling
import Scheduling from "./pages/Scheduling";
import Book from "./pages/Book";

// Teams & Ohweees
import Teams from "./pages/Teams";
import Ohweees from "./pages/Ohweees";

// Profile
import Profile from "./pages/Profile";

// OrgChart
import OrgChart from "./pages/OrgChart";

// Team Directory
import TeamDirectory from "./pages/TeamDirectory";

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
        <Route path="/sops/category/:slug" component={SOPCategory} />
        <Route path="/sops/new" component={SOPEditor} />
        <Route path="/sops/edit/:slug" component={SOPEditor} />
        
        {/* Other Routes */}
        <Route path="/search" component={Search} />
        <Route path="/chat" component={Chat} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/onboarding" component={Onboarding} />
        
        {/* Leave/Vacation Routes */}
        <Route path="/leave" component={Leave} />
        
        {/* Calendar */}
        <Route path="/calendar" component={Calendar} />
        <Route path="/calendar/settings" component={CalendarSettings} />
        
        {/* Scheduling */}
        <Route path="/scheduling" component={Scheduling} />
        <Route path="/book/:slug" component={Book} />
        
        {/* Ohweees (Chat) */}
        <Route path="/ohweees" component={Ohweees} />
        <Route path="/ohweees/:roomId" component={Ohweees} />
        
        {/* Settings & Mentions */}
        <Route path="/settings/email" component={EmailSettings} />
        <Route path="/mentions" component={Mentions} />
        
        {/* Profile */}
        <Route path="/profile" component={Profile} />
        
        {/* OrgChart */}
        <Route path="/orgchart" component={OrgChart} />
        
        {/* Team Directory */}
        <Route path="/team" component={TeamDirectory} />
        
        {/* Admin Routes */}
        <Route path="/admin/teams" component={Teams} />
        <Route path="/admin/categories" component={AdminCategories} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/settings" component={AdminSettings} />
        <Route path="/admin/feedback" component={AdminFeedback} />
        <Route path="/admin/reviews" component={AdminReviews} />
        <Route path="/admin/audit-log" component={AdminAuditLog} />
        <Route path="/admin/leave" component={AdminLeave} />
        <Route path="/admin/leave-balances" component={AdminLeaveBalances} />
        <Route path="/admin/announcements" component={AdminAnnouncements} />
        <Route path="/admin/assignments" component={AdminAssignments} />
        <Route path="/admin/analytics" component={AdminAnalytics} />
        <Route path="/admin/verification" component={AdminVerification} />
        
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
      <ThemeProvider defaultTheme="system" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
