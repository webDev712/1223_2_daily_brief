'use client';

import { useEffect, useState } from "react";
import { LoginButton } from "../../src/components/LoginButton";
import './page.css'
import { Plan } from "@/lib/types";
import { toast } from "sonner";

export default function Login() {
  const handlePayment = async () => {
      if (!selectedPlan) {
          alert('Please select a plan');
          return;
      }

      const response = await fetch(
          '/api/stripe/create-checkout',
          {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({ email: email, adminName: name, companyName: companyName, planId: selectedPlan, }),
          }
      );

      const data = await response.json();

      if (data.url) {
          window.location.href = data.url;
      }
  };
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showSignUp, setShowSignUp] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('')
  useEffect(() => {
      fetch('/api/plan')
          .then(res => res.json())
          .then(data => {
            setPlans(data.sort((a: any, b: any) => a.price - b.price));
            setSelectedPlan(data[1]?.id)
          });
      
  }, []);

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const message = params.get('message');

  if (message) {
    toast.success(message);

    // Убираем message из URL после показа
    window.history.replaceState({}, '', '/login');
  }
}, []);
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
        <div onClick={() => {setShowSignUp(true)}}>Sign Up!</div>
      </div>
      {showSignUp && selectedPlan && (
        <div className="confirm">
          <div>
            <h1>Create Your Daily Brief!</h1>
            <div>
              <label>
                <span>Company Name</span>
                <input type="text"value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </label>
              <label>
                <span>Email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <label>
                <span>Name</span>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
            </div>
            <div className="flex">
              {plans.map(plan => (
                <button key={plan.id} onClick={() => setSelectedPlan(plan.id)} className={selectedPlan === plan.id ? 'selected' : ''}>
                  <h3>{plan.name}</h3>
                  <p>${plan.price} / month</p>
                  <p>Up to {plan.max_users} users</p>

                </button>
                ))}
            </div>
              <div>
                <div className="button-w-bl" onClick={() => setShowSignUp(false)}>Cancel</div>
                <div className="button-d-bl">
                  <button onClick={handlePayment}>
                    Get Access for ${plans.find((el: Plan) => el.id === selectedPlan).price}
                </button>
                </div>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}
