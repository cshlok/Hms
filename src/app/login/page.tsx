// src/app/login/page.tsx
"use client"; // Add this directive for client-side interactivity

import { useState } from "react";
import { useRouter } from "next/navigation"; // Use next/navigation for App Router
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast"; // Assuming use-toast hook is available from template

// Define interface for the expected API response
interface LoginApiResponse {
  error?: string;
  user?: {
    username?: string;
    // Add other user properties if known/needed
  };
  // Add other potential properties
}

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ identifier, password }),
      });

      // Add type assertion for the response data
      const data = await response.json() as LoginApiResponse;

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Login successful
      toast({
        title: "Login Successful",
        description: `Welcome back, ${data.user?.username || "user"}!`, // Use optional chaining
      });

      // TODO: Redirect based on role or to role selector if needed
      // For now, redirect to a placeholder dashboard
      router.push("/dashboard");

    } catch (err: unknown) { // Use unknown
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
      toast({
        title: "Login Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <div className="flex flex-col items-center">
          <Image src="/images/shlokam_logo.jpg" alt="Shlokam Logo" width={150} height={50} className="mb-4" />
          <h2 className="mt-6 text-2xl font-bold text-center text-gray-900 dark:text-white">
            Login
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 text-center text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400" role="alert">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <Label htmlFor="identifier">Username or Email</Label>
              <Input
                id="identifier"
                name="identifier"
                type="text" // Allow both username and email
                autoComplete="username email"
                required
                className="mt-1"
                placeholder="Username or Email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="pt-4">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="mt-1"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Add Forgot password link if needed */}

          <div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

