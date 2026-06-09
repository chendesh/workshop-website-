import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import OwnerLayout from './components/OwnerLayout';
import WorkerLayout from './components/WorkerLayout';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';

// Owner Pages
import OwnerDashboard from './pages/owner/Dashboard';
import WorkLogs from './pages/owner/WorkLogs';
import Attendance from './pages/owner/Attendance';
import Wages from './pages/owner/Wages';
import Camps from './pages/owner/Camps';
import Workers from './pages/owner/Workers';
import Reports from './pages/owner/Reports';

// Worker Pages
import WorkerDashboard from './pages/worker/Dashboard';
import MyAttendance from './pages/worker/MyAttendance';
import MyWages from './pages/worker/MyWages';
import MyProfile from './pages/worker/MyProfile';

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Owner Portal */}
          <Route path="/owner" element={
            <ProtectedRoute allowedRole="owner">
              <OwnerLayout />
            </ProtectedRoute>
          }>
            <Route index element={<OwnerDashboard />} />
            <Route path="work-logs" element={<WorkLogs />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="wages" element={<Wages />} />
            <Route path="camps" element={<Camps />} />
            <Route path="workers" element={<Workers />} />
            <Route path="reports" element={<Reports />} />
          </Route>

          {/* Worker Portal */}
          <Route path="/worker" element={
            <ProtectedRoute allowedRole="worker">
              <WorkerLayout />
            </ProtectedRoute>
          }>
            <Route index element={<WorkerDashboard />} />
            <Route path="attendance" element={<MyAttendance />} />
            <Route path="wages" element={<MyWages />} />
            <Route path="profile" element={<MyProfile />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
