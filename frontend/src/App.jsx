import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Page Imports
import Home from "./pages/Home"; 
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import PatientDashboard from "./pages/PatientDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import CaregiverDashboard from "./pages/CaregiverDashboard";

// Component Imports
import ProtectedRoute from "./components/ProtectedRoute"; // 👈 Ensure this name matches exactly
import Chatbot from "./components/Chatbot"; // Global AI Assistant

export default function App() {
  return (
    <Router>
      <Routes>
        {/* 🟢 Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* 🔐 Protected Patient Route */}
        <Route
          path="/patient"
          element={
            <ProtectedRoute allowedRole="patient">
              <PatientDashboard />
            </ProtectedRoute>
          }
        />

        {/* 🔐 Protected Doctor Route */}
        <Route
          path="/doctor"
          element={
            <ProtectedRoute allowedRole="doctor">
              <DoctorDashboard />
            </ProtectedRoute>
          }
        />

        {/* 🔐 Protected Caregiver Route (Using general protected route for demo) */}
        <Route
          path="/caregiver"
          element={
            <ProtectedRoute allowedRole="patient">
              <CaregiverDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>

      {/* 🤖 GLOBAL CHATBOT - Stays visible on all pages */}
      <Chatbot /> 
    </Router>
  );
}