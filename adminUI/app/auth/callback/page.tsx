"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    console.log(searchParams);
    
    const token = searchParams.get("token");
    const profile = searchParams.get("profile");

    console.log(token);
    if (token) {
      localStorage.setItem("access_token", token);
      if (profile) {
        localStorage.setItem("profile_info", profile);
      }

      router.replace("/");
    } else {
      router.replace("/login");
    }
  }, [router, searchParams]);

  return <div>Signing you in...</div>;
}