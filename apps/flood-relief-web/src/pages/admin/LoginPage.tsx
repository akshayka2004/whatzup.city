import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { ShieldAlert, LogIn } from "lucide-react";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/api/client";

export function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isLoading && user) {
    return <Navigate to="/admin" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await login({ email, password });
      toast.success("Signed in successfully");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-primary-950 px-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary-900 text-white">
            <ShieldAlert className="size-6" aria-hidden="true" />
          </span>
          <h1 className="font-heading text-xl font-bold text-primary-900">Administrator Login</h1>
          <p className="text-sm text-primary-500">Kerala Flood Relief Portal admin panel</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Input
            label="Email address"
            type="email"
            name="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" isLoading={isSubmitting} className="mt-1">
            <LogIn className="size-4.5" aria-hidden="true" />
            Sign in
          </Button>
        </form>
      </Card>
    </div>
  );
}
