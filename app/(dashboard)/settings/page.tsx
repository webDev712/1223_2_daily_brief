'use client';

import Loader from '@/app/src/components/Loader';
import { useState, useEffect } from 'react';
import { User, CompanyToDisplay, Company, Plan, Billing } from '@/lib/types';
import './page.css'
import UserCircle from '@/app/src/components/UserCircle';
import { getRoles } from '@/lib/config';
import generatePhoneNumber from '@/lib/phone';
import { toast } from 'sonner';
import capitalize from '@/lib/text';
import { format } from 'date-fns';

export default function Settings() {
  const [user, setUser] = useState<User | null>()
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [showSubmitArchive, setShowSubmitArchive] = useState(false);
  const [dataChanged, setDataChanged] = useState(false);
  const [company, setCompany] = useState<CompanyToDisplay>();
  const [showAssignAnotherAdmin, setShowAssignAnotherAdmin] = useState(false)
  const [users, setUsers] = useState<User[]>([]);
  const [selectedNewAdmin, setSelectedNewAdmin] = useState<string>();
  const [plans, setPlans] = useState<Plan[]>();
  const [companyName, setCompanyName] = useState<string>();
  const [allowSave, setAllowSave] = useState(false);
  const [billings, setBillings] = useState<Billing[]>();
  
  const changeUser = (user: User) => {
    if (dataChanged === false) setDataChanged(true);
    setUser(user);
  }
  useEffect(() => {
    async function load() {
      setLoading(true);
      const me_res = await fetch("/api/me");
      const me_user = await me_res.json();
      setUser(me_user);
      const company_res = await fetch('/api/company');
      const company_data = await company_res.json();
      console.log('company_data')
      console.log(company_data)
      const users_res = await fetch('/api/users');
      let users_data = await users_res.json();
      users_data = users_data.sort((a: User, b: User) => b.user_role.localeCompare(a.user_role))
      // const plans_res = await fetch('/api/plan');
      // const plans_data = await plans_res.json();
      // setPlans(plans_data);
      const billings_res = await fetch('/api/billing');
      const billings_data = await billings_res.json();
      setBillings(billings_data)
      setUsers(users_data)
      setCompany(company_data[0]);
      setCompanyName(company_data[0].name)
      setSelectedNewAdmin(company_data[0].main_admin_id)
      setAllowSave(false);
      setLoading(false);
    }
    load()
  }, [reload])
  const saveUser = () => {
    setLoading(true)
    fetch('/api/user', {method: 'PATCH', headers: {"Content-Type": "application/json"}, body: JSON.stringify({...user, archived: false})}).then(res => {
      if (res.status === 200) {
        setReload(prev => prev + 1)
        toast.success('User data saved successfully!')
      }
      else{
        toast.error('Error while saving user data. Try again later.')
      }
      setLoading(false)
      setDataChanged(false)
    })
  }
  const [selectedSettings, setSelectedSettings] = useState('my')
  const archiveUserAccount = (user: User | null | undefined) => {
    if (!user) return;
    fetch('/api/user', {method: 'PATCH', headers: {"Content-Type": "application/json"}, body: JSON.stringify({...user, archived: true})}).then(res => {
      if (res.status === 200) {
        toast.success('Your account archived now!');
        setTimeout(() => { window.location.href = "/login" }, 5000)
      }
    })
  }

  const sendCompany = async (company: CompanyToDisplay | undefined) => {
    if (!company) return;
    setShowAssignAnotherAdmin(false);
    setLoading(true);
    const company_res = await fetch('/api/company', {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(company)
    })
    if (!company_res.ok) {
      console.log("Error while sending company data.");
      setLoading(false)
      return;
    }
    setReload(prev => prev + 1);
  }
  return (
    <div className="settings">
      {showSubmitArchive && (
        <div className='confirm'>
          <div>
            <h1>Archive your account?</h1>
            <p>After archiving <strong>you won't have access to Daily Brief system</strong></p>
            <p>Only manager will be able to activate your account again</p>
            <div>
              <div className='button-w-bl' onClick={() => {setShowSubmitArchive(false)}}>Cancel</div>
              <div className='button-d-bl' onClick={() => archiveUserAccount(user)}>Archive My Account</div>
            </div>
          </div>
        </div>
      )}
      {loading || !user ?
        (<Loader></Loader>)
        : (
          <div>
            <div>
              <div data-img="bell" className={selectedSettings === 'my' ? 'selected' : ''} onClick={() => {setSelectedSettings('my')}}>My Profile</div>
              {company?.main_admin_id === user.id && (<div data-img="house" className={selectedSettings === 'company' ? 'selected' : ''} onClick={() => {setSelectedSettings('company')}}>Company</div>)}
              {user.permissions.see_app_settings && (
                <div data-img="shield" className={selectedSettings === 'data' ? 'selected' : ''} onClick={() => {setSelectedSettings('data')}}>Data & Security</div>
              )}
            </div>
            {selectedSettings === 'my' && (
              <div className='my'>
                <div>
                  <UserCircle user_name={user.name} size={100} />
                  <div>
                    <div className='schmall'>
                      <UserCircle user_name={user.name} size={40} />
                      <div>{user.name}</div>
                    </div>
                    <div>{getRoles(user.role)}</div>
                    <div>{user.email}</div>
                  </div>
                </div>
                <div>
                  <div>
                    <div>PERSONAL INFORMATION</div>
                    <div className={dataChanged && user.permissions.edit_app_settings ? "button-d-bl-sm" : "button-d-bl-sm d" } onClick={() => {if (!dataChanged || !user.permissions.edit_app_settings) {return;} saveUser()}}>Save Changes</div>
                  </div>
                  <div>
                    <label>
                      <span>FULL NAME</span>
                      <input className={user.permissions.edit_app_settings ? '' : 'd'} disabled={!user.permissions.edit_app_settings} type="text" value={user.name} onChange={(e) => changeUser({...user, name: e.target.value})}/>
                    </label>
                    <label>
                      <span>ROLE</span>
                      <input type="text" className='d' value={getRoles(user.role)} onChange={() => {}} disabled />
                    </label>
                    <label>
                      <span>EMAIL</span>
                      <input className={user.permissions.edit_app_settings ? '' : 'd'} disabled={!user.permissions.edit_app_settings} type="text" value={user.email} onChange={(e) => changeUser({...user, email: e.target.value})} />
                    </label>
                    <label>
                      <span>PHONE</span>
                      <input className={user.permissions.edit_app_settings ? '' : 'd'}
                        type="tel"
                        inputMode="tel"
                        placeholder="+1 202 555 0123"
                        value={user.phone}
                        disabled={!user.permissions.edit_app_settings}
                        onChange={(e) => {
                          changeUser({
                            ...user,
                            phone: generatePhoneNumber(e.target.value),
                          });
                        }}
                      />                    
                    </label>
                    <label>
                      <span>DEPARTMENT</span>
                      <input type="text" className='d' value={user.department} onChange={() => {}} disabled/>
                    </label>
                  </div>
                </div>
                <div>
                  <div>
                    <div>Danger zone</div>
                    <div>Permanently delete your profile and all associated data. This cannot be undone.</div>
                  </div>
                  <div className={user.permissions.edit_profile_settings ? 'button-w-r-sm' : 'button-w-r-sm d' } onClick={() => {if (!user.permissions.edit_profile_settings) return; setShowSubmitArchive(true)}}>Archive my account</div>
                </div>
                {/* {JSON.stringify(user)} */}
              </div>)}
            {selectedSettings === 'company' && (
              <div className='company'>
                <h1>Company</h1>
                <p>Manage company settings and subscriptions.</p>
                {company && (
                  <div>
                    <div>
                      <div>
                        <h2>MAIN ADMIN OF "{companyName}"</h2>
                        <div className='flex'>
                          <UserCircle user_name={company.admin_name || 'Admin'} size={30}></UserCircle>
                          <div>{company.admin_name}</div>
                          <div className='button-d-bl-sm' onClick={() => {setShowAssignAnotherAdmin(true)}}>Assign another Main Admin</div>
                        </div>
                      </div>
                      <div className='company-data'>
                        <div>
                          <div>COMPANY DATA</div>
                          <div className={allowSave ? "button-d-bl-sm" : "button-d-bl-sm d"} onClick={() => {if (allowSave) sendCompany(company)}}>Save Changes</div>
                        </div>
                        <div>
                          <label>
                            <span>Name</span>
                            <input type="text" value={company.name} onChange={(e) => {setCompany({...company, name: e.target.value}); setAllowSave(true);}} />
                          </label>
                          <label>
                            <span>Plan</span>
                            <input className="plan" type="text" value={company.plan_name} onChange={() => {}} disabled />
                          </label>
                          <label>
                            <span>Created At</span>
                            <input type="text" value={format(new Date(company.created_at), 'MM-dd-yyyy')} disabled className='d' onChange={() => {}}/>
                          </label>
                        </div>
                      </div>
                    </div>
                    <div>
                      Billings
                    </div>
                  </div>
                )}
              </div>)}
            {selectedSettings === 'data' && (
              <div className='data'>
                <h1>Data & Security</h1>
                <p>Manage data retention, exports, and security preferences.</p>
                <div>
                  <div>EXPORT DATA</div>
                  <div>
                    <div>
                      <div>Export all briefs</div>
                      <div>Download a full archive of all Route Department briefs</div>
                    </div>
                    <div className='button-d-bl-sm d'>Export CSV</div>
                    <div className='button-d-bl-sm d' style={{display: 'none'}}>Export PDF</div>
                  </div>
                </div>
                <div>
                  <div>DANGER ZONE</div>
                  <div>
                    <div>
                      <div>Delete all brief history</div>
                      <div>Permanently remove all historical briefs. This cannot be undone.</div>
                    </div>
                    <div className='button-w-r-sm d'>Delete all history</div>
                  </div>
                </div>
              </div>)}
          </div>
        )}
        {showAssignAnotherAdmin && (
          <div className='confirm'>
            <div>
              <h1>Select another Admin:</h1>
              <div>
                {users.map((user: User) => {
                  return (
                    <label key={`assign_another_user_${user.id}`}>
                      <input type='radio' checked={user.id === selectedNewAdmin} onChange={(e) => setSelectedNewAdmin(user.id)} name='select-another-admin' />
                      <div>{user.name} ({capitalize(user.user_role)})</div>
                    </label>
                  )
                })}
              </div>
              <div>
                <div className='button-w-bl' onClick={() => {setShowAssignAnotherAdmin(false)}}>Close</div>
                <div className='button-d-bl' onClick={() => {if (selectedNewAdmin && company) sendCompany({...company, main_admin_id: selectedNewAdmin })}}>Confirm</div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
