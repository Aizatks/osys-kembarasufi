"use client";

import { useState, useEffect } from "react";

export interface Role {
  id: string;
  label: string;
  color: string;
  is_admin: boolean;
  is_system: boolean;
  sort_order: number;
}

// Fallback roles if API fails
const FALLBACK_ROLES: Role[] = [
  { id: "staff", label: "Sales", color: "bg-emerald-100 text-emerald-700", is_admin: false, is_system: true, sort_order: 1 },
  { id: "admin", label: "Admin", color: "bg-purple-100 text-purple-700", is_admin: true, is_system: true, sort_order: 20 },
  { id: "superadmin", label: "Superadmin", color: "bg-red-100 text-red-700", is_admin: true, is_system: true, sort_order: 99 },
];

let cachedRoles: Role[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 1 minute

export function useRoles() {
  const [roles, setRoles] = useState<Role[]>(cachedRoles || FALLBACK_ROLES);
  const [loading, setLoading] = useState(!cachedRoles);

  useEffect(() => {
    // Use cache if fresh
    if (cachedRoles && Date.now() - cacheTimestamp < CACHE_TTL) {
      setRoles(cachedRoles);
      setLoading(false);
      return;
    }

    const fetchRoles = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          setLoading(false);
          return;
        }
        const res = await fetch("/api/settings/roles", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const fetched = (data.roles || []) as Role[];
          cachedRoles = fetched;
          cacheTimestamp = Date.now();
          setRoles(fetched);
        }
      } catch (err) {
        console.error("Failed to fetch roles:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRoles();
  }, []);

  const invalidateCache = () => {
    cachedRoles = null;
    cacheTimestamp = 0;
  };

  const getRoleConfig = (roleId: string) => {
    return roles.find((r) => r.id === roleId) || { id: roleId, label: roleId, color: "bg-slate-100 text-slate-700", is_admin: false, is_system: false, sort_order: 50 };
  };

  // Roles suitable for display in RBAC/staff assignment (exclude unassigned)
  const assignableRoles = roles.filter((r) => r.id !== "unassigned");

  return { roles, assignableRoles, loading, getRoleConfig, invalidateCache };
}
