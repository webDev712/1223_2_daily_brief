"use client";

import { signIn } from "next-auth/react";
import './css/LoginButton.css'

export function LoginButton() {
  return (
    <div className="loginGoogle" onClick={() => signIn("google", {
        callbackUrl: "/daily-brief",
      })}>
        <div>Continue with Google</div>
    </div>
  );
}