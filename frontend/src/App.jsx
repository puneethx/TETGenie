import { Routes, Route } from 'react-router-dom'
import { RequireAuth, RequireAdmin, PublicOnly } from './components/guards'
import AppShell from './components/AppShell'
import DailyGate from './components/DailyGate'

import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import NotFound from './pages/NotFound'

import Dashboard from './pages/app/Dashboard'
import Papers from './pages/app/Papers'
import PaperView from './pages/app/PaperView'
import Exam from './pages/app/Exam'
import Daily from './pages/app/Daily'
import Subjects from './pages/app/Subjects'
import SubjectView from './pages/app/SubjectView'
import Leaderboard from './pages/app/Leaderboard'
import Account from './pages/app/Account'

import AdminDashboard from './pages/admin/AdminDashboard'
import Upload from './pages/admin/Upload'
import Generate from './pages/admin/Generate'
import Users from './pages/admin/Users'

export default function App() {
  return (
    <Routes>
      {/* Public marketing landing */}
      <Route path="/" element={<Home />} />

      {/* Auth screens — redirect away if already signed in */}
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      {/* Everything behind auth shares the mobile app shell */}
      <Route element={<RequireAuth />}>
        {/* Full-screen focused exams — intentionally outside the app shell */}
        <Route path="/app/papers/:paperId/exam" element={<Exam kind="py" />} />
        <Route
          path="/app/daily/:paperId/exam"
          element={<DailyGate><Exam kind="daily" /></DailyGate>}
        />
        <Route path="/app/subjects/:paperId/exam" element={<Exam kind="subject" />} />

        <Route element={<AppShell />}>
          <Route path="/app" element={<Dashboard />} />
          <Route path="/app/papers" element={<Papers />} />
          <Route path="/app/papers/:paperId" element={<PaperView kind="py" />} />
          <Route path="/app/daily" element={<Daily />} />
          <Route
            path="/app/daily/:paperId"
            element={<DailyGate><PaperView kind="daily" /></DailyGate>}
          />
          <Route path="/app/subjects" element={<Subjects />} />
          <Route path="/app/subjects/:subjectId" element={<SubjectView />} />
          <Route path="/app/leaderboard" element={<Leaderboard />} />
          <Route path="/app/account" element={<Account />} />

          {/* Admin-only */}
          <Route element={<RequireAdmin />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/upload" element={<Upload />} />
            <Route path="/admin/generate" element={<Generate />} />
            <Route path="/admin/users" element={<Users />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
