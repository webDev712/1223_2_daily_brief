'use client';

import './page.css';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Loader from '../src/components/Loader';
import { LoginButton } from '../src/components/LoginButton';
import scrollToElement from '@/lib/html_document';
import Link from 'next/link';
import { Plan } from '@/lib/types';

export default function Landing () {
    const handlePayment = async () => {
        if (!email || !name || !companyName) {
            toast.error('Please enter all data.');
            return;
        }
        console.log('0')
        if (!selectedPlan) {
            toast.error('Please select a plan');
            return;
        }
        console.log('1')
        setLoading(true);
        const all_users_res = await fetch('/api/all_companies_users');
        const all_users_data = await all_users_res.json();
        console.log('2')
        if (all_users_data.length > 0) {
            console.log('3')
            setLoading(false);
            toast.error('You already have account in the Daily Brief system. Please login.')
            return;
        }
        console.log('4')
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
        console.log('5')

        if (data.url) {
            window.location.href = data.url;
        }
        console.log('6')
    };
    const [plans, setPlans] = useState<any[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [showSignUp, setShowSignUp] = useState(false);
    const [companyName, setCompanyName] = useState('');
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
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
    
        window.history.replaceState({}, '', '/landing');
      }
    }, []);
    const scrollToPlansAndShowAlert = () => {
        scrollToElement('plans')
        toast.info("Select a plan and press Get Started")
    }

    return (
        <div className="landing">
            <div className="header">
                <strong>Daily Brief</strong>
                <div>
                    <div className="a" onClick={() => {scrollToElement('features')}}>Features</div>
                    <div className="a" onClick={() => {scrollToElement('plans')}}>Plans</div>
                    <div className="a" onClick={() => {scrollToElement('links')}}>Links</div>
                </div>
                <div>
                    <LoginButton></LoginButton>
                    <div className="button-d-bl" onClick={scrollToPlansAndShowAlert}>Get Started</div>
                </div>
            </div>
            <div className="block block_1">
                <div>
                    <h1>Your Team.</h1>
                    <h1>Your Day.</h1>
                    <h1>One Brief.</h1>
                    <p>Daily Brief helps teams organize daily operations, manage employees, track tasks, and keep everyone aligned in one simple platform.</p>
                    <div className="flex">
                        <div className="button-d-bl" onClick={scrollToPlansAndShowAlert}>Get Started</div>
                        <LoginButton></LoginButton>
                    </div>
                    <div>
                        <span>Quick Setup</span>
                        <span>Built for every team</span>
                        <span>Custom functionality</span>
                    </div>
                </div>
            </div>
            <div id='features' className='no-padding-margin'></div>
            <div className="block block_2" >
                <h3>ONE CONNECTED WORKSPACE</h3>
                <h4>Everything your team needs for the day</h4>
                <h5>Replace scattered tools and manual follow-ups with one clear view of the work that matters.</h5>
                <div className="four-block">
                        <div img-id="document">
                            <h1>Daily Reports</h1>
                            <div>Create, review and manage daily reports with clear, structured updates.</div>
                        </div>
                        <div img-id="done">
                            <h1>Action Tracker</h1>
                            <div>Track tasks from open to resolved, with ownership and due dates.</div>
                        </div>
                        <div img-id="document-yellow">
                            <h1>Departments</h1>
                            <div>Organize employees, teams and responsibilities across your company.</div>
                        </div>
                        <div img-id="tasks-red">
                            <h1>Team Communication</h1>
                            <div>Keep important communication connected to daily operations.</div>
                        </div>
                </div>
            </div>
            <div className="no-padding-margin" id="plans"></div>
            <div className="block block_3">
                <h3>YOU DECIDE, HOW BIG YOUR SYSTEM IS</h3>
                <h4>SELECT A PLAN</h4>
                <h5>Choose the plan that fits your team and get everything you need to manage your daily operations.</h5>
                <div className="flex">
                    {plans.map(plan => (
                        <button key={plan.id} onClick={() => setSelectedPlan(plan.id)} className={selectedPlan === plan.id ? 'selected plan' : 'plan'}>
                            <h3>{plan.name}</h3>
                            <div>Up to {plan.max_users} users</div>
                            <p>${plan.price} / month</p>
                        </button>
                        ))}
                </div>
                <div className="button-d-bl" onClick={() => {setShowSignUp(true)}}>Proceed</div>
                <div className='small-block-blue'>
                    <h3>Move work forward, together</h3>
                    <h4>Make every workday easier.</h4>
                    <h5>Bring your daily operations, reports and team management into one place.</h5>
                    <div className="button-w-bl" onClick={scrollToPlansAndShowAlert}>Get Started</div>
                </div>
            </div>
            <div className="footer" id='links'>
                <div>
                    <strong>Daily Brief</strong>
                    <div>
                        <div>Daily operations, made simple for modern teams</div>
                        <div className='a' onClick={() => {scrollToElement('features')}}>Features</div>
                        <div className='a' onClick={() => {scrollToElement('plans')}}>Plans</div>
                        <Link href={'/privacy-page'}>Privacy Policy</Link>
                    </div>
                </div>
                <div>
                    <div>© 2026 Daily Brief. All rights reserved.</div>
                    <div>Built to make every day count.</div>
                </div>
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
            {loading && <Loader></Loader>}
            
        </div>
    )
}
