import UserFilter from "@/components/filter/UserFilter";
import { FilterModal } from "@/components/modal/FilterModal";
import { UserUpsertModal } from "@/components/modal/UserUpsertModal";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { UserList } from "@/types/index.ts";
import { CircleCheckBig, CircleOff, Eye } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import type { Column } from "../../components/CommonTable";
import CommonTable from "../../components/CommonTable";
import { DeleteModal } from "../../components/modal/DeleteModal";
import api from "../../lib/api";

export default function UsersPage() {
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserList[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [roleList, setRoleList] = useState<string[]>([]);

  const [filters, setFilters] = useState({
    q: "",
    role: "",
    user_type: "",
    is_active: "true",
  });

  const [appliedFilters, setAppliedFilters] = useState(filters);
  const types = ["system_user", "sales_person"];
  const statusList = [
    { value: "true", label: "Active" },
    { value: "false", label: "Inactive" },
    { value: "all", label: "All" },
  ];

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
    [appliedFilters],
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
    const delayDebounce = setTimeout(() => {
      setAppliedFilters((prev) => ({
        ...prev,
        q: filters.q,
      }));
      setPage(1);
    }, 500); // 500ms debounce

    return () => clearTimeout(delayDebounce);
  }, [filters.q]);

  useEffect(() => {
    fetchUsers(page);
  }, [fetchUsers, page]);

  // ===============================
  // CRUD HANDLERS
  // ===============================
  const confirmDelete = async (id: string | number) => {
    try {
      await api.delete(`/api/users/${id}`);
      toast.success("User deleted successfully");
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch {
      toast.error("Failed to delete user");
      throw new Error("delete failed"); // important so modal can keep open
    }
  };

  const handleFormSuccess = (user: UserList, isEdit: boolean) => {
    if (isEdit) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, ...user } : u)),
      );
    } else {
      setUsers((prev) => [user, ...prev]);
    }
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
          {Array.isArray(row.roles) ? row.roles.join(", ") : row.roles}
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
              <span className="inline-flex items-center">
                {row.user_type === "sales_person" ? (
                  <CircleOff className="text-red-500 size-4" />
                ) : (
                  <CircleCheckBig className="text-green-600 size-4" />
                )}
              </span>
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
        <div className="flex gap-2 items-center">
          <Eye
            onClick={() => navigate(`/app/users/${row.id}`)}
            className="text-blue-400 hover:text-blue-600 size-4 cursor-pointer"
          />

          <UserUpsertModal
            user={row}
            roles={roleList}
            onSuccess={handleFormSuccess}
            type="icon"
          />

          <DeleteModal
            onDeleteItem={confirmDelete}
            actionLoading={loading}
            id={row.id}
            name={row.name}
            type="icon"
          />
        </div>
      ),
    },
  ];

  // ===============================
  // RENDER
  // ===============================
  return (
    <>
      <div className="flex justify-between items-center mb-4 gap-10">
        <h1 className="text-xl font-semibold">Users</h1>

        <div className="flex w-full sm:w-auto items-center gap-2">
          {/* SEARCH (left of filter button) */}
          <Input
            className="sm:w-[320px] flex-1"
            placeholder="Search name, email or code..."
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          />

          <FilterModal type="button" label="Filters" title="User Filters">
            {(closeModal) => (
              <UserFilter
                filters={filters}
                setFilters={setFilters}
                setAppliedFilters={setAppliedFilters}
                setPage={setPage}
                roleList={roleList}
                types={types}
                statusList={statusList}
                closeModal={closeModal}
              />
            )}
          </FilterModal>

          <UserUpsertModal
            user={null}
            roles={roleList}
            onSuccess={handleFormSuccess}
            type="button"
            triggerLabel="Add User"
          />
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
    </>
  );
}
