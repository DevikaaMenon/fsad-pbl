import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { auth, SESSION_EXPIRED } from './api.js';
import Layout from './components/Layout.jsx';
import { RequireAuth, RequireRole, Splash } from './components/Guards.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import Account from './pages/auth/Account.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ClubList from './pages/clubs/ClubList.jsx';
import ClubForm from './pages/clubs/ClubForm.jsx';
import ClubDetail, { ClubEvents, ClubMembers, ClubNotices, ClubOverview, ClubRequests } from './pages/clubs/ClubDetail.jsx';
import JoinClub from './pages/clubs/JoinClub.jsx';
import EventList from './pages/events/EventList.jsx';
import EventDetail from './pages/events/EventDetail.jsx';
import EventForm from './pages/events/EventForm.jsx';
import MemberList from './pages/members/MemberList.jsx';
import MemberForm from './pages/members/MemberForm.jsx';
import NoticeBoard from './pages/notices/NoticeBoard.jsx';
import NoticeForm from './pages/notices/NoticeForm.jsx';
import RequestList from './pages/requests/RequestList.jsx';
import Reports from './pages/reports/Reports.jsx';
import UserList from './pages/users/UserList.jsx';
import NotFound from './pages/NotFound.jsx';

const MANAGERS = ['admin', 'lead'];

export default function App() {
  // undefined = still checking, null = logged out, object = logged in
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    auth.me().then(setUser).catch(() => setUser(null));
    const onExpired = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED, onExpired);
  }, []);

  async function handleLogout() {
    await auth.logout().catch(() => {});
    setUser(null);
  }

  if (user === undefined) return <Splash />;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login onLogin={setUser} />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register onLogin={setUser} />} />

      <Route element={<RequireAuth user={user}><Layout user={user} onUserChange={setUser} onLogout={handleLogout} /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        <Route path="account" element={<Account />} />

        <Route path="clubs">
          <Route index element={<ClubList />} />
          <Route element={<RequireRole roles={['admin']} />}>
            <Route path="new" element={<ClubForm />} />
          </Route>
          <Route element={<RequireRole roles={MANAGERS} />}>
            <Route path=":id/edit" element={<ClubForm />} />
          </Route>
          <Route path=":id/join" element={<JoinClub />} />
          <Route path=":id" element={<ClubDetail />}>
            <Route index element={<ClubOverview />} />
            <Route path="events" element={<ClubEvents />} />
            <Route path="notices" element={<ClubNotices />} />
            <Route path="members" element={<ClubMembers />} />
            <Route path="requests" element={<ClubRequests />} />
          </Route>
        </Route>

        <Route path="events">
          <Route index element={<EventList />} />
          <Route path=":id" element={<EventDetail />} />
          <Route element={<RequireRole roles={MANAGERS} />}>
            <Route path="new" element={<EventForm />} />
            <Route path=":id/edit" element={<EventForm />} />
          </Route>
        </Route>

        <Route path="notices">
          <Route index element={<NoticeBoard />} />
          <Route element={<RequireRole roles={MANAGERS} />}>
            <Route path="new" element={<NoticeForm />} />
            <Route path=":id/edit" element={<NoticeForm />} />
          </Route>
        </Route>

        <Route path="requests" element={<RequestList />} />

        <Route element={<RequireRole roles={MANAGERS} />}>
          <Route path="members" element={<MemberList />} />
          <Route path="members/new" element={<MemberForm />} />
          <Route path="members/:id/edit" element={<MemberForm />} />
        </Route>

        <Route element={<RequireRole roles={['admin']} />}>
          <Route path="reports" element={<Reports />} />
          <Route path="users" element={<UserList />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
