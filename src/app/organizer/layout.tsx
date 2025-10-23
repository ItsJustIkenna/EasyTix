"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getLocalStorage, removeLocalStorage } from "@/lib/localStorage";

export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Skip auth check for register page
      if (pathname === "/organizer/register") {
        setLoading(false);
        return;
      }

      const token = getLocalStorage("token");

      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!data.success) {
          removeLocalStorage("token");
          removeLocalStorage("user");
          router.push("/login");
          return;
        }

        // Check if user has organizer access or is admin
        const isOrganizer = data.data.isOrganizer;
        const isAdmin = data.data.user.role === "ADMIN";

        if (!isOrganizer && !isAdmin) {
          router.push("/");
          return;
        }

        setLoading(false);
      } catch (error: unknown) {
        console.error("Auth check failed:", error);
        removeLocalStorage("token");
        removeLocalStorage("user");
        router.push("/login");
      }
    };

    checkAuth();
  }, [router, pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
