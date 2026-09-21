'use client';

import { LoginButton } from "../../src/components/LoginButton";
import './page.css'

const handlePayment = async () => {
    const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email: 'test@example.com',
        }),
    });

    const data = await response.json();

    if (data.url) {
        window.location.href = data.url;
    }
};

export default async function Login() {
  return (
    <div className="login">
      <div>
        <div>
          <span></span>
          <div>Helen's Cleaners</div>
        </div>
        <div></div>
        <div>
          <h1>Keep Every Route on Track</h1>
          <p>Monitor driver activity, review reports and findings, manage shift handoffs, and complete daily briefs—all in one place.</p>
        </div>
      </div>
      <div>
        <div>Welcome!</div>
        <p>Sign in to your account with Google</p>
        <LoginButton></LoginButton>
        <span>Can't log in? Contact your manager</span>
        <button onClick={handlePayment}>
          Pay $99.99
      </button>
      </div>
    </div>
  );
}
