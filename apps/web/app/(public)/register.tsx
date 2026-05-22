// User and Company Registration Page (Public)
'use client';

import { useState } from 'react';
import { useForm } from '@/lib/hooks/use-form';
import { validateEmail, validatePassword, validateUsername } from '@/lib/utils/validation';
import { authService } from '@/lib/services/auth-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function RegisterPage() {
  const [step, setStep] = useState<'user' | 'company' | 'done'>('user');
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // User Registration Form
  const userForm = useForm({
    initialValues: { name: '', email: '', password: '' },
    onSubmit: async (values) => {
      setError(null);
      if (!validateEmail(values.email)) {
        setError('Invalid email address');
        return;
      }
      if (!validatePassword(values.password).valid) {
        setError('Password is too weak');
        return;
      }
      if (!validateUsername(values.name).valid) {
        setError('Invalid username');
        return;
      }
      // Call authService to register user
      const user = await authService.signUp(values.email, values.password, values.name);
      if (user && user.id) {
        setUserId(user.id);
        setStep('company');
      } else {
        setError('Registration failed');
      }
    },
  });

  // Company Registration Form
  const companyForm = useForm({
    initialValues: { companyName: '', companyEmail: '', companyPhone: '' },
    onSubmit: async (values) => {
      setError(null);
      // TODO: Call API to create company and set status to 'pending_verification'
      // Example: await companyService.create({ ...values, userId, status: 'pending_verification' })
      setStep('done');
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <Card className="p-8 rounded-2xl w-full max-w-md">
        {step === 'user' && (
          <form onSubmit={userForm.handleSubmit} className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">Create Your Account</h2>
            <Input
              name="name"
              placeholder="Full Name"
              value={userForm.values.name}
              onChange={userForm.handleChange}
              required
            />
            <Input
              name="email"
              type="email"
              placeholder="Email"
              value={userForm.values.email}
              onChange={userForm.handleChange}
              required
            />
            <Input
              name="password"
              type="password"
              placeholder="Password"
              value={userForm.values.password}
              onChange={userForm.handleChange}
              required
            />
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <Button type="submit" className="w-full rounded-lg">
              Continue
            </Button>
          </form>
        )}
        {step === 'company' && (
          <form onSubmit={companyForm.handleSubmit} className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">Register Your Company</h2>
            <Input
              name="companyName"
              placeholder="Company Name"
              value={companyForm.values.companyName}
              onChange={companyForm.handleChange}
              required
            />
            <Input
              name="companyEmail"
              type="email"
              placeholder="Company Email"
              value={companyForm.values.companyEmail}
              onChange={companyForm.handleChange}
              required
            />
            <Input
              name="companyPhone"
              placeholder="Company Phone"
              value={companyForm.values.companyPhone}
              onChange={companyForm.handleChange}
              required
            />
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <Button type="submit" className="w-full rounded-lg">
              Submit for Review
            </Button>
          </form>
        )}
        {step === 'done' && (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Registration Submitted</h2>
            <p>
              Your company registration is under review. You will be notified once it is verified by
              an admin.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
