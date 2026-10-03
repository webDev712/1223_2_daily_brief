"use client";

import { signIn } from "next-auth/react";
import './css/LoginButton.css'
import { useState } from "react";
import Loader from "./Loader";

export function LoginButton() {
  const [loading, setLoading] = useState(false);
  return (
    <div className="loginGoogle" onClick={() => 
      {
        setLoading(true);
        signIn("google", {
          callbackUrl: "/daily-brief",
        });
        setLoading(false);
      }
    }>
        <div>Sign In!</div>
        {loading && (<Loader></Loader>)}
    </div>
  );
}