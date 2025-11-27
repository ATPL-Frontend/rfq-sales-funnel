import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Check,
  ChevronsUpDown,
  CircleCheckBig,
  CircleOff,
  Edit,
  Eye,
  Trash2,
} from "lucide-react";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";

import type { Column } from "../../components/CommonTable";
import CommonTable from "../../components/CommonTable";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import api from "../../lib/api";
import UserForm from "../auth/RegisterPage";
import type { UserList } from "@/types/index.ts";

export default function UsersPage() {
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserList[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [roleList, setRoleList] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserList | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // ===============================
  // FILTER SYSTEM (like Invoices)
  // ===============================
  const [filters, setFilters] = useState({
    q: "",
    role: "",
    user_type: "",
    is_active: "true", // default → show only active users
  });

  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [roleOpen, setRoleOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const types = ["system_user", "sales_person"];
  const statusList = [
    { value: "true", label: "Active" },
    { value: "false", label: "Inactive" },
    { value: "all", label: "All" },
  ];

  // ===============================
  // FETCH USERS
  // ===============================
  const fetchUsers = useCallback(
    async (pageNum = 1) => {
      setLoading(true);
      try {
        const { data } = await api.get("/api/users", {
          params: {
            page: pageNum,
            limit: 20,
            q: appliedFilters.q || undefined,
            role: appliedFilters.role || "all",
            user_type: appliedFilters.user_type || "all",
            is_active: appliedFilters.is_active || "true",
          },
        });

        setUsers(data.data || []);
        setPage(data.page || pageNum);
        setTotalPages(data.total_pages || 1);
      } catch {
        toast.error("Failed to load users");
      } finally {
        setLoading(false);
      }
    },
    [appliedFilters]
  );

  const fetchRoles = useCallback(async () => {
    try {
      const { data } = await api.get("/api/roles");
      const roleNames = data.data.map((r: any) => r.name);
      setRoleList(roleNames);
    } catch {
      toast.error("Failed to load roles");
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    fetchUsers(page);
  }, [fetchUsers, page]);

  // ===============================
  // CRUD HANDLERS
  // ===============================
  const handleCreate = () => {
    setSelectedUser(null);
    setFormOpen(true);
  };

  const handleEdit = (u: UserList) => {
    setSelectedUser(u);
    setFormOpen(true);
  };

  const handleDelete = (u: UserList) => {
    setSelectedUser(u);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;
    try {
      await api.delete(`/api/users/${selectedUser.id}`);
      toast.success("User updated successfully");
      setUsers((p) => p.filter((u) => u.id !== selectedUser.id));
      setDeleteOpen(false);
    } catch {
      toast.error("Failed to update user");
    }
  };

  const handleFormSuccess = (user: UserList, isEdit: boolean) => {
    if (isEdit) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, ...user } : u))
      );
    } else {
      setUsers((prev) => [user, ...prev]);
    }
    setFormOpen(false);
  };

  // ===============================
  // TABLE COLUMNS
  // ===============================
  const columns: Column<UserList>[] = [
    {
      key: "name",
      label: "Name",
      render: (row) => (
        <Link
          to={`/app/users/${row.id}`}
          className="text-primary hover:underline font-medium"
        >
          {row.name}
        </Link>
      ),
    },
    { key: "email", label: "Email" },
    {
      key: "roles",
      label: "Role",
      render: (row) => (
        <span>
          {Array.isArray(row.roles)
            ? row.roles.join(", ")
            : row.roles}
        </span>
      ),
    },
    { key: "short_form", label: "Short Form" },

    {
      key: "user_type",
      label: <div className="text-center">Accessibility</div>,
      render: (row) => (
        <div className="flex justify-center items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                {row.user_type === "sales_person" ? (
                  <CircleOff className="text-red-500 size-4" />
                ) : (
                  <CircleCheckBig className="text-green-600 size-4" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              {row.user_type === "sales_person"
                ? "Sales Person (no system login)"
                : "System User (has login access)"}
            </TooltipContent>
          </Tooltip>
        </div>
      ),
    },

    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex gap-2">
          <Button
            onClick={() => navigate(`/app/users/${row.id}`)}
            variant="secondary"
            size="icon"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button onClick={() => handleEdit(row)} size="icon">
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => handleDelete(row)}
            variant="destructive"
            size="icon"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  // ===============================
  // RENDER
  // ===============================
  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Users</h1>
        <Button onClick={handleCreate}>Add User</Button>
      </div>

      {/* ============================
          FILTERS PANEL (same as Invoices)
      ============================ */}
      <div className="p-4 mb-4 border border-primary border-dashed rounded grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* SEARCH */}
        <Input
          placeholder="Search name, email or code..."
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
        />

        {/* ROLE FILTER */}
        <Popover open={roleOpen} onOpenChange={setRoleOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-between">
              {filters.role || "Select Role"}
              <ChevronsUpDown className="w-4 h-4 opacity-50" />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-60 p-0 ml-6">
            <Command>
              <CommandList>
                <CommandEmpty>No roles found.</CommandEmpty>
                <CommandGroup>
                  {roleList.map((r) => (
                    <CommandItem
                      key={r}
                      value={r}
                      onSelect={() => {
                        setFilters((prev) => ({
                          ...prev,
                          role: prev.role === r ? "" : r,
                        }));
                        setRoleOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "h-4 w-4",
                          filters.role === r ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {r}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* USER TYPE */}
        <Popover open={typeOpen} onOpenChange={setTypeOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-between">
              {filters.user_type || "User Type"}
              <ChevronsUpDown className="w-4 h-4 opacity-50" />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-60 p-0 ml-6">
            <Command>
              <CommandList>
                <CommandGroup>
                  {types.map((t) => (
                    <CommandItem
                      key={t}
                      value={t}
                      onSelect={() => {
                        setFilters((prev) => ({
                          ...prev,
                          user_type: prev.user_type === t ? "" : t,
                        }));
                        setTypeOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "h-4 w-4",
                          filters.user_type === t ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {t}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* ACTIVE STATUS */}
        <Popover open={statusOpen} onOpenChange={setStatusOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-between">
              {statusList.find((s) => s.value === filters.is_active)?.label ||
                "Status"}
              <ChevronsUpDown className="w-4 h-4 opacity-50" />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-60 p-0 ml-6">
            <Command>
              <CommandList>
                <CommandGroup>
                  {statusList.map((s) => (
                    <CommandItem
                      key={s.value}
                      value={s.label}
                      onSelect={() => {
                        setFilters((prev) => ({
                          ...prev,
                          is_active: s.value,
                        }));
                        setStatusOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "h-4 w-4",
                          filters.is_active === s.value
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      {s.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* EMPTY CELL FILLER */}
        <div></div>

        {/* APPLY + CLEAR */}
        <div className="flex items-center gap-2 col-span-2 md:col-span-3 lg:col-span-6">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              const cleared = {
                q: "",
                role: "",
                user_type: "",
                is_active: "true",
              };
              setFilters(cleared);
              setAppliedFilters(cleared);
              setPage(1);
            }}
          >
            Clear Filters
          </Button>

          <Button
            className="flex-1"
            onClick={() => {
              setAppliedFilters(filters);
              setPage(1);
            }}
          >
            Apply Filters
          </Button>
        </div>
      </div>

      {/* TABLE */}
      <CommonTable
        columns={columns}
        data={users}
        loading={loading}
        hasMore={page < totalPages}
        onLoadMore={() => setPage((p) => p + 1)}
      />

      {/* CREATE/EDIT USER MODAL */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedUser ? "Edit User" : "Create User"}
            </DialogTitle>
          </DialogHeader>
          <UserForm
            user={selectedUser}
            roles={roleList}
            onSuccess={handleFormSuccess}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to deactivate{" "}
            <span className="font-semibold">{selectedUser?.name}</span>?
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={loading}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
