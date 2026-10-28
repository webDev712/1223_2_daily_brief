'use client';

import Loader from '@/app/src/components/Loader';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('settings');
  const strong = (chunks: React.ReactNode) => <strong>{chunks}</strong>;

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
        toast.success(t('toast.userSaved'))
      }
      else{
        toast.error(t('toast.userSaveError'))
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
        toast.success(t('toast.accountArchived'));
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
    
    toast.success(t('toast.departmentAdded', { name: newDeparmentName }))
    
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
    toast.info(t('toast.departmentDeleted', { name: dep.name }))
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
    
    toast.success(t('toast.shiftAdded', { name: `${formatTime12Hour(shiftFrom)} - ${formatTime12Hour(shiftTo)}` }))
    
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
    toast.info(t('toast.shiftDeleted', { name: shift.name }))
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
            <h1>{t('archive.title')}</h1>
            <p>{t.rich('archive.warning', { strong })}</p>
            <p>{t('archive.managerOnly')}</p>
            <div>
              <div className='button-w-bl' onClick={() => {setShowSubmitArchive(false)}}>{t('common.cancel')}</div>
              <div className='button-d-bl' onClick={() => archiveUserAccount(user)}>{t('archive.confirmButton')}</div>
            </div>
          </div>
        </div>
      )}
      {showAddDepartment && (
        <div className='confirm'>
          <div>
            <h1>{t('department.addTitle')}</h1>
            <div>
              <span>{t('department.nameLabel')}</span>
              <input type="text" placeholder={t('department.namePlaceholder')} className='input' value={newDeparmentName} onChange={(e) => setNewDeparmentName(e.target.value)}/>
            </div>
            <div>
              <div className='button-w-bl' onClick={() => {setShowAddDepartment(false)}}>{t('common.cancel')}</div>
              <div className='button-d-bl' onClick={() => addDepartment()}>{t('common.confirm')}</div>
            </div>
          </div>
        </div>
      )}
      {showAddShift && (
        <div className="confirm add-shift">
          <div>
            <h1>{t('shift.addTitle')}</h1>

            <div>
              <div>
                <span>{t('shift.from')}</span>
                <input
                  type="time"
                  className="input"
                  value={shiftFrom}
                  onChange={(e) => setShiftFrom(e.target.value)}
                  required
                />
              </div>

              <div>
                <span>{t('shift.to')}</span>
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
                {t('common.cancel')}
              </div>

              <div
                className="button-d-bl"
                onClick={() => {
                  addShift();
                }}
              >
                {t('common.confirm')}
              </div>
            </div>
          </div>
        </div>
      )}
      {showDeleteDepartment && departmentToDelete?.users && (
        <div className='confirm'>
          <div>
              <h1>{t('department.deleteTitle', { name: departmentToDelete?.name ?? '' })}</h1>
              {departmentToDelete?.users?.length > 0 ? (
                <div style={{textAlign: 'center'}}>
                  <p style={{marginBottom: 0}}>{t('department.usersRemain')}</p>
                  <div style={{marginBottom: '10px'}}>
                    {departmentToDelete.users.map((user: User) => (
                      <Link href={`teams-and-roles?scroll_to_id=${user.id}`} key={`deparmentToDelete-${departmentToDelete.id}-list-user-${user.id}`}><strong style={{textAlign: 'left', padding: '0px 30px', display: 'block'}}>{user.name}</strong></Link>
                    ))}
                  </div>
                  <p>{t('department.changeFirst')}</p>
                </div>
              ) : (
                <p>{t.rich('department.afterDelete', { strong })}</p>
              )}
            <div>
              <div className='button-w-bl' onClick={() => {setShowDeleteDepartment(false)}}>{t('common.cancel')}</div>
              {departmentToDelete?.users?.length === 0 && (<div className='button-w-r' onClick={() => editDepartment({...departmentToDelete, is_main: false})} style={{lineHeight: '32px'}}>{t('common.delete')}</div>)}
            </div>
          </div>
        </div>
      )}
      {showDeleteShift && shiftToDelete && (
        <div className='confirm'>
          <div>
              <h1>{t('shift.deleteTitle', { name: shiftToDelete?.name ?? '' })}</h1>
              <p>{t('shift.afterDelete')}</p>
              <div>
                <div className='button-w-bl' onClick={() => {setShowDeleteShift(false)}}>{t('common.cancel')}</div>
                <div className='button-w-r' onClick={() => editShift({...shiftToDelete, archived: true})} style={{lineHeight: '32px'}}>{t('common.delete')}</div>
              </div>
          </div>
        </div>
      )}

      {loading || !user ?
        (<Loader></Loader>)
        : (
          <div>
            <div>
              <div data-img="bell" className={selectedSettings === 'my' ? 'selected' : ''} onClick={() => {setSelectedSettings('my')}}>{t('tabs.myProfile')}</div>
              {company?.main_admin_id === user.id && (<div data-img="house" className={selectedSettings === 'company' ? 'selected' : ''} onClick={() => {setSelectedSettings('company')}}>{t('tabs.company')}</div>)}
              {user.permissions.see_app_settings && (
                <div data-img="shield" className={selectedSettings === 'data' ? 'selected' : ''} onClick={() => {setSelectedSettings('data')}}>{t('tabs.dataSecurity')}</div>
              )}
              {user.permissions.manage_configuration && (<div data-img="lists" className={selectedSettings === 'lists' ? 'selected' : ''} onClick={() => {setSelectedSettings('lists')}}>{t('tabs.lists')}</div>)}
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
                    <div>{t('profile.personalInformation')}</div>
                    <div className={dataChanged && user.permissions.edit_app_settings ? "button-d-bl-sm" : "button-d-bl-sm d" } onClick={() => {if (!dataChanged || !user.permissions.edit_app_settings) {return;} saveUser()}}>{t('common.saveChanges')}</div>
                  </div>
                  <div>
                    <label>
                      <span>{t('profile.fullName')}</span>
                      <input className={user.permissions.edit_app_settings ? '' : 'd'} disabled={!user.permissions.edit_app_settings} type="text" value={user.name} onChange={(e) => changeUser({...user, name: e.target.value})}/>
                    </label>
                    <label>
                      <span>{t('profile.role')}</span>
                      <input type="text" className='d' value={getRoles(user.role)} onChange={() => {}} disabled />
                    </label>
                    <label>
                      <span>{t('profile.email')}</span>
                      <input className={user.permissions.edit_app_settings ? '' : 'd'} disabled={!user.permissions.edit_app_settings} type="text" value={user.email} onChange={(e) => changeUser({...user, email: e.target.value})} />
                    </label>
                    <label>
                      <span>{t('profile.phone')}</span>
                      <input className={user.permissions.edit_app_settings ? '' : 'd'}
                        type="tel"
                        inputMode="tel"
                        placeholder={t('profile.phonePlaceholder')}
                        value={user?.phone ?? ''}
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
                      <span>{t('profile.department')}</span>
                      <input type="text" className='d' value={user.department} onChange={() => {}} disabled/>
                    </label>
                  </div>
                </div>
                <div>
                  <div>
                    <div>{t('profile.dangerZone')}</div>
                    <div>{t('profile.dangerDescription')}</div>
                  </div>
                  <div className={user.permissions.edit_profile_settings ? 'button-w-r-sm' : 'button-w-r-sm d' } onClick={() => {if (!user.permissions.edit_profile_settings) return; setShowSubmitArchive(true)}}>{t('profile.archiveButton')}</div>
                </div>
                {/* {JSON.stringify(user)} */}
              </div>)}
            {selectedSettings === 'company' && (
              <div className='company'>
                <h1>{t('company.title')}</h1>
                <p>{t('company.description')}</p>
                {company && (
                  <div>
                    <div>
                      <div>
                        <h2>{t('company.mainAdminOf', { company: companyName ?? '' })}</h2>
                        <div className='flex'>
                          <UserCircle user_name={company.admin_name || t('company.defaultAdmin')} size={30}></UserCircle>
                          <div>{company.admin_name}</div>
                          <div className='button-d-bl-sm' onClick={() => {setShowAssignAnotherAdmin(true)}}>{t('company.assignAdmin')}</div>
                        </div>
                      </div>
                      <div className='company-data'>
                        <div>
                          <div>{t('company.companyData')}</div>
                          <div className={allowSave ? "button-d-bl-sm" : "button-d-bl-sm d"} onClick={() => {if (allowSave) sendCompany(company)}}>{t('common.saveChanges')}</div>
                        </div>
                        <div>
                          <label>
                            <span>{t('company.name')}</span>
                            <input type="text" value={company.name} onChange={(e) => {setCompany({...company, name: e.target.value}); setAllowSave(true);}} />
                          </label>
                          <label>
                            <span>{t('company.plan')}</span>
                            <input className="plan" type="text" value={company.plan_name} onChange={() => {}} disabled />
                          </label>
                          <label>
                            <span>{t('company.createdAt')}</span>
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
                <h1>{t('data.title')}</h1>
                <p>{t('data.description')}</p>
                <div>
                  <div>{t('data.exportData')}</div>
                  <div>
                    <div>
                      <div>{t('data.exportAllBriefs')}</div>
                      <div>{t('data.exportAllBriefsDescription')}</div>
                    </div>
                    <div className='button-d-bl-sm d'>{t('data.exportCsv')}</div>
                    <div className='button-d-bl-sm d' style={{display: 'none'}}>{t('data.exportPdf')}</div>
                  </div>
                </div>
                <div>
                  <div>{t('data.dangerZone')}</div>
                  <div>
                    <div>
                      <div>{t('data.deleteHistory')}</div>
                      <div>{t('data.deleteHistoryDescription')}</div>
                    </div>
                    <div className='button-w-r-sm d'>{t('data.deleteHistoryButton')}</div>
                  </div>
                </div>
              </div>)}
            {selectedSettings === 'lists' && (
              <div className='lists'>
                <h1>{t('lists.title')}</h1>
                <p>{t('lists.description')}</p>
                <div className='small-table'>
                  <h2>
                    <div>{t('lists.departments')}</div>
                    <div className="button-d-bl-sm" onClick={() => {setShowAddDepartment(true)}}>{t('lists.addDepartment')}</div>
                  </h2>
                  {departments.map((dep: Department) => (
                    <div key={`department-list-${dep.id}`}>
                      <div>
                        <div>{dep.name}</div>
                        <div>{t('lists.usersCount', { count: dep.users?.length ?? 0 })}</div>
                      </div>
                      <div className='button-r-sm' onClick={() => {setDepartmentToDelete(dep); setShowDeleteDepartment(true);}}>{t('common.delete')}</div>
                    </div>
                  ))}
                </div>
                <div className='small-table'>
                  <h2>
                    <div>{t('lists.shifts')}</div>
                    <div className="button-d-bl-sm" onClick={() => {setShowAddShift(true)}}>{t('lists.addShift')}</div>
                  </h2>
                  {shifts && shifts.map((shift: Shift) => (
                    <div key={`shift-list-${shift.id}`}>
                      <div>
                        <div>{shift.name}</div>
                      </div>
                      <div className='button-r-sm' onClick={() => {setShiftToDelete(shift); setShowDeleteShift(true);}}>{t('common.delete')}</div>
                    </div>
                  ))}
                </div>

              </div>)}
          </div>
        )}
        {showAssignAnotherAdmin && (
          <div className='confirm'>
            <div>
              <h1>{t('assignAdmin.title')}</h1>
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
                <div className='button-w-bl' onClick={() => {setShowAssignAnotherAdmin(false)}}>{t('common.close')}</div>
                <div className='button-d-bl' onClick={() => {if (selectedNewAdmin && company) sendCompany({...company, main_admin_id: selectedNewAdmin })}}>{t('common.confirm')}</div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}