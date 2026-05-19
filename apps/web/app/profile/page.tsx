'use client';

import { PublicLayout } from '@/components/layouts/public-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit2, Mail, Phone, MapPin, LogOut } from 'lucide-react';

export default function ProfilePage() {
  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">My Profile</h1>

        {/* Profile Info */}
        <Card className="p-8 rounded-2xl mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-3xl font-bold">
                JD
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-1">John Doe</h2>
                <p className="text-muted-foreground">Member since May 2024</p>
              </div>
            </div>
            <Button className="rounded-lg gap-2">
              <Edit2 className="h-4 w-4" />
              Edit Profile
            </Button>
          </div>
        </Card>

        {/* Personal Info */}
        <Card className="p-6 rounded-2xl mb-8">
          <h3 className="text-xl font-bold text-foreground mb-6">Personal Information</h3>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">First Name</label>
              <Input value="John" className="rounded-lg" disabled />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Last Name</label>
              <Input value="Doe" className="rounded-lg" disabled />
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3 p-4 bg-secondary rounded-xl">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium text-foreground">john@example.com</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-secondary rounded-xl">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium text-foreground">(555) 123-4567</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-secondary rounded-xl">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium text-foreground">New York, NY</p>
              </div>
            </div>
          </div>

          <Button className="w-full rounded-lg">Save Changes</Button>
        </Card>

        {/* Account Settings */}
        <Card className="p-6 rounded-2xl mb-8">
          <h3 className="text-xl font-bold text-foreground mb-6">Account Settings</h3>
          <div className="space-y-4">
            <Button variant="outline" className="w-full rounded-lg justify-start">
              Change Password
            </Button>
            <Button variant="outline" className="w-full rounded-lg justify-start">
              Email Preferences
            </Button>
            <Button variant="outline" className="w-full rounded-lg justify-start">
              Privacy Settings
            </Button>
            <Button variant="outline" className="w-full rounded-lg justify-start text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </Card>
      </div>
    </PublicLayout>
  );
}
