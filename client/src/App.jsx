import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { CustomerAuthProvider } from './context/CustomerAuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import CustomerProtectedRoute from './components/CustomerProtectedRoute';
import OwnerLayout from './components/OwnerLayout';
import WorkerLayout from './components/WorkerLayout';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';

// Customer Pages
import CustomerSignup from './pages/customer/CustomerSignup';
import CustomerLogin from './pages/customer/CustomerLogin';
import CustomerDashboard from './pages/customer/CustomerDashboard';

// Owner Pages
import OwnerDashboard from './pages/owner/Dashboard';
import WorkRequests from './pages/owner/WorkRequests';
import WorkLogs from './pages/owner/WorkLogs';
import Attendance from './pages/owner/Attendance';
import Wages from './pages/owner/Wages';
import Camps from './pages/owner/Camps';
import Workers from './pages/owner/Workers';
import Reports from './pages/owner/Reports';
import Inventory from './pages/owner/Inventory';


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
          
          {/* Customer Portal */}
          <Route path="/customer/*" element={
            <CustomerAuthProvider>
              <Routes>
                <Route path="signup" element={<CustomerSignup />} />
                <Route path="login" element={<CustomerLogin />} />
                <Route path="dashboard" element={
                  <CustomerProtectedRoute>
                    <CustomerDashboard />
                  </CustomerProtectedRoute>
                } />
              </Routes>
            </CustomerAuthProvider>
          } />

          {/* Owner Portal */}
          <Route path="/owner" element={
            <ProtectedRoute allowedRole="owner">
              <OwnerLayout />
            </ProtectedRoute>
          }>
            <Route index element={<OwnerDashboard />} />
            <Route path="work-requests" element={<WorkRequests />} />
            <Route path="work-logs" element={<WorkLogs />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="wages" element={<Wages />} />
            <Route path="camps" element={<Camps />} />
            <Route path="workers" element={<Workers />} />
            <Route path="reports" element={<Reports />} />
            <Route path="inventory" element={<Inventory />} />

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
