import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { AdminUser } from "@/types";

export interface UserFormValues {
  name: string;
  email: string;
  password: string;
}

function toFormValues(user: AdminUser | null): UserFormValues {
  return {
    name: user?.name ?? "",
    email: user?.email ?? "",
    password: "",
  };
}

export function UserForm({
  initialValue,
  onSubmit,
  isSubmitting,
}: {
  initialValue: AdminUser | null;
  onSubmit: (input: UserFormValues) => void;
  isSubmitting: boolean;
}) {
  const [values, setValues] = useState<UserFormValues>(() => toFormValues(initialValue));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Full name" required value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} />
      <Input
        label="Email address"
        type="email"
        required
        autoComplete="off"
        value={values.email}
        onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
      />
      <Input
        label={initialValue ? "New password" : "Password"}
        type="password"
        required={!initialValue}
        autoComplete="new-password"
        hint={initialValue ? "Leave blank to keep the current password." : "Minimum 8 characters."}
        value={values.password}
        onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
      />

      <div className="mt-2 flex justify-end gap-3 border-t border-border-subtle pt-4">
        <Button type="submit" isLoading={isSubmitting}>
          {initialValue ? "Save changes" : "Create user"}
        </Button>
      </div>
    </form>
  );
}
