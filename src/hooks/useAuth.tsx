import { useEffect, useState } from "react";
import { api, getToken, removeToken } from "@/lib/api";

export type AppRole = "citizen" | "officer" | "dept_admin" | "admin" | "super_admin";

export const ROLE_LABEL: Record<AppRole, string> = {
  citizen: "Citizen",
  officer: "Field Officer",
  dept_admin: "Department Admin",
  admin: "Admin",
  super_admin: "Super Admin",
};

export type User = {
  _id: string;
  email: string;
  fullName: string;
  role: AppRole;
  department: string | null;
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const token = getToken();
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const userData = await api.auth.me();
        setUser(userData);
      } catch (error) {
        console.error("Auth check failed:", error);
        removeToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const logout = () => {
    removeToken();
    setUser(null);
  };

  const isPrivileged = user?.role !== "citizen";
  return { 
    user, 
    role: user?.role ?? null, 
    department: user?.department ?? null, 
    loading, 
    isPrivileged,
    logout
  };
}