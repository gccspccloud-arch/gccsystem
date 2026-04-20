import { Routes, Route } from 'react-router-dom';

import MainLayout from '@/layouts/MainLayout';
import LoginPage from '@/pages/LoginPage';
import AnnouncementsPage from '@/pages/AnnouncementsPage';
import DashboardPage from '@/pages/DashboardPage';
import ReportsPage from '@/pages/ReportsPage';
import CalendarPage from '@/pages/CalendarPage';
import MeetingsPage from '@/pages/MeetingsPage';
import RegisterMemberPage from '@/pages/RegisterMemberPage';
import MembersListPage from '@/pages/MembersListPage';
import MemberProfilePage from '@/pages/MemberProfilePage';
import UsersPage from '@/pages/UsersPage';
import AttendancePage from '@/pages/AttendancePage';
import OutreachListPage from '@/pages/OutreachListPage';
import OutreachProfilePage from '@/pages/OutreachProfilePage';
import OutreachAttendeeProfilePage from '@/pages/OutreachAttendeeProfilePage';
import NotFoundPage from '@/pages/NotFoundPage';
import ProtectedRoute from '@/components/ProtectedRoute';

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route
          path="reports"
          element={
            <ProtectedRoute roles={['super_admin', 'admin']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="meetings" element={<MeetingsPage />} />
        <Route path="outreach" element={<OutreachListPage />} />
        <Route path="outreach/:id" element={<OutreachProfilePage />} />
        <Route path="outreach/:id/attendees/:attendeeId" element={<OutreachAttendeeProfilePage />} />
        <Route path="attendance/:kind/:id" element={<AttendancePage />} />
        <Route path="members" element={<MembersListPage />} />
        <Route
          path="members/register"
          element={
            <ProtectedRoute roles={['super_admin', 'admin']}>
              <RegisterMemberPage />
            </ProtectedRoute>
          }
        />
        <Route path="members/:id" element={<MemberProfilePage />} />
        <Route
          path="users"
          element={
            <ProtectedRoute roles={['super_admin', 'admin']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default App;
