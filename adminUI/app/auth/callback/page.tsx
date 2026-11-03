"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let token = searchParams.get("token");
    let profile = searchParams.get("profile");

    // Fallback if token itself contained urlencoded query parameters (e.g. "?token=token=...&profile=...")
    if (token && token.includes("profile=")) {
      try {
        const queryStr = token.startsWith("token=") ? token : `token=${token}`;
        const parsed = new URLSearchParams(queryStr);
        const innerToken = parsed.get("token");
        const innerProfile = parsed.get("profile");
        if (innerToken) token = innerToken;
        if (innerProfile) profile = innerProfile;
      } catch (err) {
        console.error("Failed to parse nested callback params:", err);
      }
    }

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

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div>Signing you in...</div>}>
      <CallbackHandler />
    </Suspense>
  );
}
