"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Users,
  Search,
  RefreshCw,
  Building2,
  Wrench,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShieldAlert,
} from "lucide-react";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  propertiesCount: number;
  servicesCount: number;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(15);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const refreshUsers = useCallback(() => {
    setIsLoading(true);
    setRefreshIndex((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadUsers() {
      try {
        const params = new URLSearchParams({
          role: roleFilter,
          page: page.toString(),
          limit: limit.toString(),
        });
        if (searchQuery.trim()) {
          params.set("search", searchQuery.trim());
        }

        const res = await fetch(`/api/v1/admin/users?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load user accounts");

        const json = await res.json();
        if (!ignore && json.success && json.data) {
          setUsers(json.data.users || []);
          setTotalPages(json.data.pagination.totalPages || 1);
          setTotalCount(json.data.pagination.totalCount || 0);
        }
      } catch (error) {
        if (!ignore) {
          console.error("[ADMIN_FETCH_USERS_ERROR]", error);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadUsers();
    return () => {
      ignore = true;
    };
  }, [roleFilter, page, limit, searchQuery, refreshIndex]);

  return (
    <div className="space-y-6 text-left">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-forest-green" />
            <h1 className="text-xl sm:text-2xl font-bold text-dark-text tracking-tight">
              Registered Accounts Directory
            </h1>
          </div>
          <p className="text-xs text-muted-text">
            Read-only overview of registered marketplace members, role assignments, and listing activity counts.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={refreshUsers}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          className="text-xs self-start sm:self-auto"
        >
          Sync Users
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-border-subtle bg-white shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted-text absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email address..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border-subtle text-xs text-dark-text placeholder:text-muted-text focus:outline-none focus:ring-1 focus:ring-forest-green"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-text">
            <span>Account Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-border-subtle bg-white text-xs text-dark-text focus:outline-none focus:ring-1 focus:ring-forest-green font-medium"
            >
              <option value="ALL">All Roles</option>
              <option value="USER">Standard Users</option>
              <option value="ADMIN">Administrators</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={refreshUsers}
            className="h-8 text-xs"
          >
            Apply
          </Button>
        </div>
      </div>

      {/* Users Directory Table */}
      <div className="rounded-xl border border-border-subtle bg-white shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-7 h-7 animate-spin text-forest-green mx-auto mb-2" />
            <p className="text-xs text-muted-text">Retrieving registered users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto">
            <h3 className="text-sm font-bold text-dark-text">No user accounts found</h3>
            <p className="text-xs text-muted-text mt-1">
              No accounts match your search or filter parameters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-border-subtle text-muted-text font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Properties</th>
                  <th className="py-3 px-4">Services</th>
                  <th className="py-3 px-4">Registered On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/60 transition-colors">
                    {/* User Profile */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-light-green text-forest-green font-bold flex items-center justify-center shrink-0 uppercase text-xs">
                          {user.name ? user.name.slice(0, 2) : "U"}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-dark-text truncate">
                            {user.name}
                          </div>
                          <div className="text-[11px] text-muted-text truncate">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {user.role === "ADMIN" ? (
                        <Badge variant="primary" size="sm" className="bg-purple-100 text-purple-900 border-purple-200">
                          ADMIN
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">
                          USER
                        </Badge>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {user.status === "ACTIVE" ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-red-700 font-medium">
                          <ShieldAlert className="w-3 h-3 text-red-600" />
                          <span>{user.status}</span>
                        </span>
                      )}
                    </td>

                    {/* Property Listings Count */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-muted-text">
                        <Building2 className="w-3.5 h-3.5 text-forest-green" />
                        <span className="font-semibold text-dark-text">{user.propertiesCount}</span>
                      </div>
                    </td>

                    {/* Service Listings Count */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-muted-text">
                        <Wrench className="w-3.5 h-3.5 text-purple-700" />
                        <span className="font-semibold text-dark-text">{user.servicesCount}</span>
                      </div>
                    </td>

                    {/* Creation Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-muted-text text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-muted-text" />
                        <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border-subtle bg-gray-50 flex items-center justify-between text-xs text-muted-text">
            <span>
              Page <strong className="text-dark-text">{page}</strong> of{" "}
              <strong className="text-dark-text">{totalPages}</strong> ({totalCount} total)
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
