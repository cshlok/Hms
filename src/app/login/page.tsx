
"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import AlertTitle
import { AlertTriangle } from "lucide-react"; // Icon for alert

// --- INTERFACES ---
// FIX: Define interface for successful login response
interface LoginSuccessResponse {
  user: {
    userId: number;
    username: string;
    roleName: string; // Assuming roleName is the correct property based on session.ts
    // Add other user properties if returned by the API
  };
  // Add other potential success properties
}

// FIX: Define interface for error response
interface LoginErrorResponse {
  error: string;
  // Add other potential error properties
}

// --- COMPONENT ---
export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState(""); // Assuming username/email is used
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      // Try to parse JSON regardless of response.ok to get error message
      // FIX: Define data type based on response status
      let data: LoginSuccessResponse | LoginErrorResponse;
      try {
        data = await response.json();
      } catch (jsonError) {
        // Handle cases where response is not JSON or empty
        throw new Error(`Login failed with status: ${response.status}. Invalid response format.`);
      }

      if (!response.ok) {
        // FIX: Access error message safely from typed error response
        const errorMessage = (data as LoginErrorResponse)?.error || `Login failed with status: ${response.status}`;
        throw new Error(errorMessage);
      }

      // FIX: Assert data as LoginSuccessResponse and access user role safely
      const successData = data as LoginSuccessResponse;
      const userRole = successData?.user?.roleName;

      if (!userRole) {
        throw new Error("Login successful, but user role is missing in the response.");
      }

      console.log(`Login successful for user: ${successData.user.username}, Role: ${userRole}`);

      // Redirect based on user role - use roleName
      // Consider a default dashboard route if roles don't match expected values
      // Note: The original code had role checks like 'Admin', 'Doctor'. Ensure these match `roleName` values from your DB/API.
      // Example: if roleName is 'administrator', the check should be `userRole === 'administrator'`
      // Using a generic dashboard redirect for now.
      router.push("/dashboard"); 

      /* Example Role-Based Redirect (adjust roles as needed):
      switch (userRole.toLowerCase()) {
        case "admin": // Or "administrator"
          router.push("/dashboard/admin"); // Example admin route
          break;
        case "doctor":
          router.push("/dashboard/doctor"); // Example doctor route
          break;
        case "receptionist":
          router.push("/dashboard/reception"); // Example receptionist route
          break;
        default:
          router.push("/dashboard"); // Default dashboard
          break;
      }
      */

    } catch (err) {
      const message = err instanceof Error ? err.message : "An unknown error occurred during login";
      setError(message);
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md bg-white dark:bg-gray-800 shadow-lg">
        <CardHeader className="space-y-1 flex flex-col items-center pt-8 pb-4">
          {/* Logo Placeholder */}
          <div className="w-24 h-24 bg-teal-600 rounded-full flex items-center justify-center mb-4">
            <span className="text-4xl font-bold text-white">S</span>
          </div>
          {/* <div className="w-32 h-32 relative mb-4">
            <Image
              src="/logo.png" // Ensure this path is correct
              alt="Shlokam Logo"
              fill
              style={{ objectFit: "contain" }}
              priority
            />
          </div> */} 
          <CardTitle className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100">Login</CardTitle>
          <CardDescription className="text-center text-gray-600 dark:text-gray-400">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          {error && (
            <Alert variant="destructive" className="mb-4 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700/50">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertTitle className="font-semibold text-red-800 dark:text-red-300">Login Failed</AlertTitle>
              <AlertDescription className="text-red-700 dark:text-red-400">
                {error}
              </AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-700 dark:text-gray-300">Username or Email</Label>
                <Input
                  id="username"
                  type="text" // Use text, could be username or email
                  placeholder="your.username or email@example.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:border-teal-500 focus:ring-teal-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:border-teal-500 focus:ring-teal-500"
                />
              </div>
            </div>
            <Button className="w-full mt-6 bg-teal-600 hover:bg-teal-700 text-white" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 pt-4 pb-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-center text-gray-600 dark:text-gray-400">
            Forgot your password?{" "}
            <Link href="/forgot-password" className="font-medium text-teal-600 hover:text-teal-500 dark:text-teal-400 dark:hover:text-teal-300">
              Reset it here
            </Link>
          </div>
          {/* <div className="text-xs text-center text-gray-500 dark:text-gray-500">
            © {new Date().getFullYear()} Shlokam Healthcare. All rights reserved.
          </div> */}
        </CardFooter>
      </Card>
    </div>
  );
}
