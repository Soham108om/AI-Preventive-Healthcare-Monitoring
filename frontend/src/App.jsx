import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Page Imports
import Home from "./pages/Home"; // 👈 1. Import the new Home page
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import PatientDashboard from "./pages/PatientDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Router>
      {/* 🔷 ROUTES */}
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} /> {/* 👈 2. Set root to Home */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* 👇 PROTECTED ROUTE: PATIENT (100% Untouched) */}
        <Route
          path="/patient"
          element={
            <ProtectedRoute allowedRole="patient">
              <PatientDashboard />
            </ProtectedRoute>
          }
        />

        {/* 👇 PROTECTED ROUTE: DOCTOR (100% Untouched) */}
        <Route
          path="/doctor"
          element={
            <ProtectedRoute allowedRole="doctor">
              <DoctorDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}