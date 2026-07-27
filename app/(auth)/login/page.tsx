import { LoginButton } from "../../src/components/LoginButton";
import './page.css'


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
      </div>
    </div>
  );
}
