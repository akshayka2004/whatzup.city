import { AdminListShell } from "@/components/admin/AdminListShell";
import { UserForm } from "@/components/admin/forms/UserForm";
import type { Column } from "@/components/admin/DataTable";
import { usersApi } from "@/api/resources";
import type { AdminUser } from "@/types";

const columns: Column<AdminUser>[] = [
  { header: "Name", render: (user) => <span className="font-medium text-primary-900">{user.name}</span> },
  { header: "Email", render: (user) => user.email },
  {
    header: "Created",
    render: (user) => new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
  },
];

export function UsersAdminPage() {
  return (
    <AdminListShell
      title="Users"
      description="Manage administrator accounts with access to the admin panel."
      searchPlaceholder="Search users..."
      addButtonLabel="Add User"
      emptyTitle="No administrator accounts yet"
      queryKey="admin-users"
      resourceApi={usersApi}
      columns={columns}
      showDistrictFilter={false}
      getItemLabel={(user) => user.name}
      renderForm={({ initialValue, onSubmit, isSubmitting }) => (
        <UserForm
          initialValue={initialValue}
          isSubmitting={isSubmitting}
          onSubmit={(values) =>
            onSubmit(values.password ? values : { name: values.name, email: values.email })
          }
        />
      )}
    />
  );
}
