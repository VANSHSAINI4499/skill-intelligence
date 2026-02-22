"use client";

import { useAuthViewModel } from "@/viewmodels/authViewModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function RegisterPage() {
  const { 
    email, setEmail, 
    password, setPassword, 
    name, setName,
    loading, error, 
    handleRegister 
  } = useAuthViewModel();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <Card className="w-[400px] shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Create Account</CardTitle>
          <CardDescription className="text-center">
            Enter your details to register
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="name">
                Full Name
              </label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            {error && (
              <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            <Button className="w-full bg-blue-600 hover:bg-blue-700" type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Register
            </Button>
            
            <div className="text-center text-sm text-slate-500 mt-4">
              Already have an account? <Link href="/login" className="text-blue-600 hover:underline">Login</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
