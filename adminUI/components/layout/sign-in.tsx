"use client"

import { signInWithGoogle } from "@/actions/auth"

export default function SignIn() {
  return (
    <form action={signInWithGoogle}>
      <button type="submit">
        Sign in with Google
      </button>
    </form>
  )
}