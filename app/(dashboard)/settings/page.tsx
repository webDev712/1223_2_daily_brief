'use client';

import Loader from '@/app/src/components/Loader';
import { useState, useEffect } from 'react';
import { User } from '@/lib/types';
import './page.css'
import UserCircle from '@/app/src/components/UserCircle';
import { getRoles } from '@/lib/config';
import generatePhoneNumber from '@/lib/phone';
import { toast } from 'sonner';

export default function Settings() {
  const [user, setUser] = useState<User | null>()
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [showSubmitArchive, setShowSubmitArchive] = useState(false);
  const [dataChanged, setDataChanged] = useState(false);
  const changeUser = (user: User) => {
    if (dataChanged === false) setDataChanged(true);
    setUser(user);
  }
  useEffect(() => {
    async function load() {
      const me_res = await fetch("/api/me");
      const me_user = await me_res.json();
      console.log('me_user')
      console.log(me_user)
      setUser(me_user)
      setLoading(false)
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
              {/* <div data-img="house" className={selectedSettings === 'general' ? 'selected' : ''} onClick={() => {setSelectedSettings('general')}}>General</div> */}
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
            {selectedSettings === 'general' && (
              <div>
                General
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
    </div>
  );
}
