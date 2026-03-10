import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import supabase from "../services/supabase";

function ProtectedRoute({ children, allowedRole }) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      // 1. Get the logged in user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      // 2. Fetch the role from the 'profiles' table
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single(); // Using .single() is okay here because a logged-in user MUST have a profile

      if (error || !profile) {
        console.error("Error fetching profile:", error);
        setAuthorized(false);
      } else {
        // 3. Compare the role from the DB with the allowedRole prop
        setAuthorized(profile.role === allowedRole);
      }

      setLoading(false);
    };

    checkAuth();
  }, [allowedRole]);

  if (loading) return <p>Checking authentication...</p>;

  // Redirect to login if not authorized (instead of just '/')
  return authorized ? children : <Navigate to="/login" replace />;
}

export default ProtectedRoute;