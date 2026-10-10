'use client';

import Loader from '@/app/src/components/Loader';
import { useState, useEffect } from 'react';
import { User, CompanyToDisplay, Company, Plan, Billing, Department, Shift } from '@/lib/types';
import './page.css'
import UserCircle from '@/app/src/components/UserCircle';
import { getRoles } from '@/lib/config';
import generatePhoneNumber from '@/lib/phone';
import { toast } from 'sonner';
import capitalize from '@/lib/text';
import { format } from 'date-fns';
import Link from 'next/link';
import formatTime12Hour from '@/lib/time';

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
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showDeleteDepartment, setShowDeleteDepartment] = useState(false);
  const [showDeleteShift, setShowDeleteShift] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<Department>();
  const [shiftToDelete, setShiftToDelete] = useState<Shift>();
  const [showAddDepartment, setShowAddDepartment] = useState(false);
  const [showAddShift, setShowAddShift] = useState(false);
  const [newDeparmentName, setNewDeparmentName] = useState('');
  const [shifts, setShifts] = useState<Shift[]>([]);

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
      const departments_res = await fetch(`/api/departments`);
      if (!departments_res.ok) {
        console.error("Failed to load departments");
        setLoading(false);
        return;
      }
      let departments_data = await departments_res.json();
      departments_data = departments_data.filter((dep: Department) => dep.is_main === true).sort((a: Department, b: Department) => a.name.localeCompare(b.name))
      console.log('departments_data')
      console.log(departments_data)
      setDepartments(departments_data);
      const shifts_res = await fetch(`/api/shifts`);
      if (!shifts_res.ok) {
        console.error("Failed to load shifts");
        setLoading(false);
        return;
      }
      let shifts_data = await shifts_res.json();
      shifts_data = shifts_data.filter((shift: Shift) => shift.archived != true).sort((a: Shift, b: Shift) => a.name.localeCompare(b.name))
      console.log('shifts_data')
      console.log(shifts_data)
      setShifts(shifts_data);

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
        setTimeout(() => { window.location.href = "/landing" }, 5000)
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

  const addDepartment = async () => {
    setLoading(true);
      const department_res = await fetch('/api/departments', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({name: newDeparmentName})
    })
    if (!department_res.ok) {
      console.log("Error while sending company data.");
      setLoading(false)
      return;
    }
    setShowAddDepartment(false);
    setReload(prev => prev + 1);
    
    toast.success(`Added new deparment "${newDeparmentName}"`)
    
    setLoading(false);
  }

  const editDepartment = async (dep: Department) => {
    setLoading(true);
      const department_res = await fetch('/api/departments', {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dep)
    })
    if (!department_res.ok) {
      console.log("Error while sending company data.");
      setLoading(false)
      return;
    }
    setShowDeleteDepartment(false);
    toast.info(`Deleted department "${dep.name}"`)
    if (dep.is_main === false){
      setDepartments(prev => prev.filter((department: Department) => 
        dep.id === department.id ? false : true
      ))

    }
    else{
      setDepartments(prev =>
        prev.map((department: Department) =>
          department.id === dep.id ? dep : department
        )
      );
    }
    setLoading(false);
  }

  const addShift = async () => {
    setLoading(true);
      const shift_res = await fetch('/api/shift', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({name: `${formatTime12Hour(shiftFrom)} - ${formatTime12Hour(shiftTo)}`})
    })
    if (!shift_res.ok) {
      console.log("Error while sending shift data.");
      setLoading(false)
      return;
    }
    setShowAddShift(false);
    setReload(prev => prev + 1);
    
    toast.success(`Added new shift "${formatTime12Hour(shiftFrom)} - ${formatTime12Hour(shiftTo)}"`)
    
    setLoading(false);
  }


  const editShift = async (shift: Shift) => {
    setLoading(true);
      const shift_res = await fetch('/api/shift', {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(shift)
    })
    if (!shift_res.ok) {
      console.log("Error while shift data.");
      setLoading(false)
      return;
    }
    setShowDeleteShift(false);
    toast.info(`Deleted shift "${shift.name}"`)
    if (shift.archived === false){
      setShifts(prev => prev.filter((shift_local: Shift) => 
        shift.id === shift_local.id ? false : true
      ))

    }
    else{
      setShifts(prev =>
        prev.map((shift_local: Shift) =>
          shift_local.id === shift.id ? shift : shift_local
        )
      );
    }
    setReload(prev => prev + 1)
    setLoading(false);
  }
const [shiftFrom, setShiftFrom] = useState('08:00');
const [shiftTo, setShiftTo] = useState('16:00');

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
      {showAddDepartment && (
        <div className='confirm'>
          <div>
            <h1>Add New Department</h1>
            <div>
              <span>Department Name</span>
              <input type="text" placeholder='Deparment ABC...' className='input' value={newDeparmentName} onChange={(e) => setNewDeparmentName(e.target.value)}/>
            </div>
            <div>
              <div className='button-w-bl' onClick={() => {setShowAddDepartment(false)}}>Cancel</div>
              <div className='button-d-bl' onClick={() => addDepartment()}>Confirm</div>
            </div>
          </div>
        </div>
      )}
      {showAddShift && (
        <div className="confirm add-shift">
          <div>
            <h1>Add New Shift</h1>

            <div>
              <div>
                <span>From</span>
                <input
                  type="time"
                  className="input"
                  value={shiftFrom}
                  onChange={(e) => setShiftFrom(e.target.value)}
                  required
                />
              </div>

              <div>
                <span>To</span>
                <input
                  type="time"
                  className="input"
                  value={shiftTo}
                  onChange={(e) => setShiftTo(e.target.value)}
                  required
                />
              </div>
            </div>
            {/* {formatTime12Hour(shiftFrom)} - {formatTime12Hour(shiftTo)} */}
            <div>
              <div
                className="button-w-bl"
                onClick={() => setShowAddShift(false)}
              >
                Cancel
              </div>

              <div
                className="button-d-bl"
                onClick={() => {
                  addShift();
                }}
              >
                Confirm
              </div>
            </div>
          </div>
        </div>
      )}
      {showDeleteDepartment && departmentToDelete?.users && (
        <div className='confirm'>
          <div>
              <h1>Delete department {departmentToDelete?.name}?</h1>
              {departmentToDelete?.users?.length > 0 ? (
                <div style={{textAlign: 'center'}}>
                  <p style={{marginBottom: 0}}>There are still users in this department:</p>
                  <div style={{marginBottom: '10px'}}>
                    {departmentToDelete.users.map((user: User) => (
                      <Link href={`teams-and-roles?scroll_to_id=${user.id}`} key={`deparmentToDelete-${departmentToDelete.id}-list-user-${user.id}`}><strong style={{textAlign: 'left', padding: '0px 30px', display: 'block'}}>{user.name}</strong></Link>
                    ))}
                  </div>
                  <p>Change their department first and then you will be able to delete this department.</p>
                </div>
              ) : (
                <p>After deleting department <strong>you won't be able to return it</strong></p>
              )}
            <div>
              <div className='button-w-bl' onClick={() => {setShowDeleteDepartment(false)}}>Cancel</div>
              {departmentToDelete?.users?.length === 0 && (<div className='button-w-r' onClick={() => editDepartment({...departmentToDelete, is_main: false})} style={{lineHeight: '32px'}}>Delete</div>)}
            </div>
          </div>
        </div>
      )}
      {showDeleteShift && shiftToDelete && (
        <div className='confirm'>
          <div>
              <h1>Delete shift {shiftToDelete?.name}?</h1>
              <p>After deleting this shift, you won't be able to return it</p>
              <div>
                <div className='button-w-bl' onClick={() => {setShowDeleteShift(false)}}>Cancel</div>
                <div className='button-w-r' onClick={() => editShift({...shiftToDelete, archived: true})} style={{lineHeight: '32px'}}>Delete</div>
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
              {company?.main_admin_id === user.id && (<div data-img="lists" className={selectedSettings === 'lists' ? 'selected' : ''} onClick={() => {setSelectedSettings('lists')}}>Lists</div>)}
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
                      {/* Billings */}
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
            {selectedSettings === 'lists' && (
              <div className='lists'>
                <h1>Lists</h1>
                <p>Manage config, add or delete options</p>
                <div className='small-table'>
                  <h2>
                    <div>DEPARTMENTS</div>
                    <div className="button-d-bl-sm" onClick={() => {setShowAddDepartment(true)}}>Add Department</div>
                  </h2>
                  {departments.map((dep: Department) => (
                    <div key={`department-list-${dep.id}`}>
                      <div>
                        <div>{dep.name}</div>
                        <div>(Users: {dep.users?.length})</div>
                      </div>
                      <div className='button-r-sm' onClick={() => {setDepartmentToDelete(dep); setShowDeleteDepartment(true);}}>Delete</div>
                    </div>
                  ))}
                </div>
                <div className='small-table'>
                  <h2>
                    <div>SHIFTS</div>
                    <div className="button-d-bl-sm" onClick={() => {setShowAddShift(true)}}>Add Shift</div>
                  </h2>
                  {shifts && shifts.map((shift: Shift) => (
                    <div key={`shift-list-${shift.id}`}>
                      <div>
                        <div>{shift.name}</div>
                      </div>
                      <div className='button-r-sm' onClick={() => {setShiftToDelete(shift); setShowDeleteShift(true);}}>Delete</div>
                    </div>
                  ))}
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
