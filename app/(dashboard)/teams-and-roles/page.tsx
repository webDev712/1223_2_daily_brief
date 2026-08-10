"use client";

import UserCircle from '@/app/src/components/UserCircle';
import Loader from '@/app/src/components/Loader';
import { useEffect, useState } from 'react';
import { Department, SavedBrief, User } from '@/lib/types';
import { format } from "date-fns";
import './page.css';
import { toast } from 'sonner';
import generatePhoneNumber from '@/lib/phone';


export default function TeamsAndRoles() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDeparments] = useState<Department[]>([]);
  const [briefs, setBriefs] = useState<SavedBrief[]>([]);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmGiveAccess, setShowConfirmGiveAccess] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [reload, setReload] = useState(0);

  const archiveUser = (user: User | null) => {
    if (user === null) return;
    fetch("/api/user", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({...user, archived: true}),
    }).then(res => {
      if (res.status === 200) {
        toast.success(`Archived user "${user.name}"`)
        setReload(prev => prev + 1);
        setShowConfirmDelete(false);
      }
    });

  };

  const addUser = () => {
    const user = {
      email: (document.getElementById('email') as HTMLInputElement)?.value || '',
      name: (document.getElementById('name') as HTMLInputElement)?.value || '',
      user_role: (document.getElementById('role') as HTMLInputElement)?.value || '',
      lead_letter: (document.getElementById('letter') as HTMLInputElement)?.value || '',
      phone: (document.getElementById('phone') as HTMLInputElement)?.value || '',
      department_id: (document.getElementById('department') as HTMLInputElement)?.value || '',
    }
    console.log('user')
    console.log(user)
    fetch("/api/user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(user),
    }).then(res => {
      if (res.status === 200) {
        toast.success(`Added user "${user.name}"`)
        setReload(prev => prev + 1);
        setShowAddUser(false);
      }
    });

  };


  const giveUserAccess = (user: User | null) => {
    if (user === null) return;
    fetch("/api/user", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({...user, archived: false}),
    }).then(res => {
      if (res.status === 200) {
        toast.success(`Now User "${user.name}" has access!`)
        setReload(prev => prev + 1);
        setShowConfirmGiveAccess(false);
      }
    });

  };

  
  useEffect(() => {
    async function load() {
      setLoading(true)
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - 7);

      let dateStringFrom = format(daysAgo, "yyyy-MM-dd");
      let dateStringTo = format(new Date(), "yyyy-MM-dd");

      const briefs_res = await fetch(`/api/brief_history?date_from=${dateStringFrom}&date_to=${dateStringTo}`);
      if (!briefs_res.ok) {
          console.error("Failed to load brief history");
          setLoading(false)
          return;
        }
      let briefs_data = await briefs_res.json();
      setBriefs(briefs_data)
      const users_res = await fetch("/api/users");
      let users_data = await users_res.json();
      users_data = await users_data.sort((a: User, b: User) => { if (a.archived !== b.archived) { return Number(a.archived) - Number(b.archived);}
          return b.user_role.length - a.user_role.length;})
      console.log('users_data')
      console.log(users_data)
      setUsers(users_data)

      let departments_res = await fetch("/api/departments");
      if (!departments_res.ok){
          console.error("Failed to load departments");
          setLoading(false)
          return;
      }
      let departments_data = await departments_res.json();
      console.log('departments_data')
      console.log(departments_data)
      setDeparments(departments_data)
      

      setLoading(false)
    }
    load();
  }, [reload]);
  
  return (
    <div className="teams-and-roles">
      {loading ? (<Loader></Loader>) :
        (<div>
          {showConfirmDelete && (
            <div className='confirm'>
              <div>
                <h1>Confirm Archiving this User?</h1>
                <p>You can give access this user back later.</p>
                <div>
                  <div className='button-w-bl' onClick={() => {setShowConfirmDelete(false)}}>Cancel</div>
                  <div className='button-d-bl' onClick={() => {archiveUser(userToDelete)}}>Archive User</div>
                </div>
              </div>
            </div>
          )}
          {showConfirmGiveAccess && (
            <div className='confirm'>
              <div>
                <h1>Confirm Giving back Access to this User?</h1>
                <div>
                  <div className='button-w-bl' onClick={() => {setShowConfirmGiveAccess(false)}}>Cancel</div>
                  <div className='button-d-bl' onClick={() => {giveUserAccess(userToDelete)}}>Give Access</div>
                </div>
              </div>
            </div>
          )}
          {showAddUser && (
            <div className='confirm add-user-form'>
              <div>
                <form id='add-user-form' onSubmit={(e) => {
                    e.preventDefault();
                    addUser();
                  }}>
                  <h1>Enter new User data:</h1>
                  <div>
                    <label>
                      <div>Name</div>
                      <input type="text" id='name' required />
                    </label>
                    <label>
                      <div>Email</div>
                      <input type="email" id='email' required />
                    </label>
                    <label>
                      <div>Phone</div>
                      <input onChange={(e) => e.target.value = generatePhoneNumber(e.target.value)} type="phone" id='phone' pattern="^\+?[0-9\s\-()]{7,20}$" required />
                    </label>
                    <label>
                      <div>Role</div>
                      <select id='role' required >
                        <option value="lead">Route Lead</option>
                        <option value="manager">Route Manager</option>
                      </select>
                    </label>
                    <label>
                      <div>Lead Letter (1 symbol A-Z)</div>
                      <input type="text" id='letter' pattern="[A-Za-z]" required />
                    </label>
                    <label>
                      <div>Department</div>
                      <select id='department'>
                        {departments.map((dep: Department) => (
                          <option key={`department_${dep.id}`} value={dep.id}>{dep.name}</option>
                        ))}
                      </select>
                    </label>
                  </div>


                  <div>
                    <div className='button-w-bl' onClick={() => {setShowAddUser(false)}}>Cancel</div>
                    <button className='button-d-bl' type='submit' form="add-user-form">Add new User</button>
                  </div>
                </form>
              </div>
            </div>
          )}
          <div className='button-d-bl-sm add-user' onClick={() => {setShowAddUser(true)}}>Add User</div>
          <div className='employees-container'>
            {users.map(user => {
              return (
                <div key={`user_${user.id}`} className={user.archived === true ? 'employee archived' : 'employee'}>
                  <div>
                    <UserCircle user_name={user.name} size={40} />
                    <div>
                      <div>{user.name}</div>
                      <div>{user.user_role === 'manager' ? 'Route Manager' : 'Route Lead'}</div>
                      <div>{user.department}</div>
                    </div>
                    <div>
                      <div className={user.user_role === 'manager' ? 'manager' : 'lead'}>{user.user_role === 'manager' ? '• Manager' : '• Lead'}</div>
                    </div>
                  </div>
                  <div>
                    <div data-img="email">{user.email}</div>
                    <div data-img="phone">{user.phone}</div>
                  </div>
                  {user.user_role === 'lead' && (
                    <div>
                      <div>
                        <div>{briefs.filter((brief: SavedBrief) => brief.lead_id === user.id).length}</div>
                        <span>Briefs</span>
                      </div>
                      <div>
                        <div>{briefs.filter((brief: SavedBrief) => brief.lead_id === user.id).reduce((a: number, brief: SavedBrief) => brief.findings ? brief.findings?.length + a : a, 0)}</div>
                        <span>Findings</span>
                      </div>
                      <div>
                        <div>{briefs.filter((brief: SavedBrief) => brief.lead_id === user.id).reduce((a: number, brief: SavedBrief) => brief.tasks ? brief.tasks?.length + a : a, 0)}</div>
                        <span>Tasks</span>
                      </div>
                    </div>
                  )}
                  {user.user_role === 'lead' && user.archived !== true && (
                    <div className='button-r-sm' style={{marginLeft: 'auto', marginTop: 15}} onClick={() => {
                      setUserToDelete(user);
                      setShowConfirmDelete(true)
                    }}>Archive Lead</div>
                  )}
                  {user.user_role === 'lead' && user.archived === true && (
                    <div className='button-r-sm' style={{marginLeft: 'auto', marginTop: 15}} onClick={() => {
                      setUserToDelete(user);
                      setShowConfirmGiveAccess(true)
                    }}>Give Access</div>
                  )}

                </div>
              )
            })}
          </div>
          <div className="role-permissions">
            <h3>Role Permissions</h3>
            <p>What each role can see and do in the system</p>
            <div>
              <div>
                <div>
                  <h6>Route Manager</h6>
                  <span>{users.filter((user: User) => user.user_role === 'manager').length} member{users.filter((user: User) => user.user_role === 'manager').length !== 1 ? 's' : ''}</span>
                </div>
                <p>View all Daily Briefs</p>
                <p>Configure report scheduling</p>
                <p>Manage team members and roles</p>
                <p>Access full brief history</p>
                <p>Receive handoff notifications</p>
                <p>View all findings and tasks</p>
              </div>
              
              <div>
                <div>
                  <h6>Route Lead</h6>
                  <span>{users.filter((user: User) => user.user_role === 'lead').length} member{users.filter((user: User) => user.user_role === 'manager').length !== 1 ? 's' : ''}</span>
                </div>
                <p>Submit, edit and hand off own Daily Briefs</p>
                <p>Review assigned operational reports</p>
                <p>Log and manage findings</p>
                <p>Create and complete tasks</p>
                <p>Submit shift handoffs</p>
                <p>View own brief history</p>
              </div>
            </div>
          </div>
        </div>)}
    </div>
  );
}
