"use client";

import UserCircle from '@/app/src/components/UserCircle';
import Loader from '@/app/src/components/Loader';
import { useEffect, useState } from 'react';
import { Department, Permission, SavedBrief, SelectedPermission, User, Role } from '@/lib/types';
import { format } from "date-fns";
import './page.css';
import { toast } from 'sonner';
import generatePhoneNumber from '@/lib/phone';
import { getPermissions } from '@/lib/config';
import capitalize, { randomEmployeeID } from '@/lib/text';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';




export default function TeamsAndRoles() {
  const t = useTranslations('TeamsAndRoles');
  const [loading, setLoading] = useState(true);
  const [me_user, setUser] = useState<User>();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDeparments] = useState<Department[]>([]);
  const [briefs, setBriefs] = useState<SavedBrief[]>([]);
  const [roles, setRoles] = useState<Role[]>()
  const [selectedPermissionsNewRole, setSelectedPermissionsNewRole] = useState<SelectedPermission[]>();
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmGiveAccess, setShowConfirmGiveAccess] = useState(false);
  const [showAddRoleForm, setShowAddRoleForm] = useState(false);
  const [showEditRoleForm, setShowEditRoleForm] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<Role | null>(null)
  const [showAddUser, setShowAddUser] = useState(false);
  const [showConfirmDeleteRole, setShowConfirmDeleteRole] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [reload, setReload] = useState(0);

  const permissions = getPermissions()


  const archiveUser = (user: User | null) => {
    if (user === null) return;
    fetch("/api/user", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({...user, department: departments.find((dep: Department) => dep.name === user.department)?.id, archived: true}),
    }).then(res => {
      if (res.status === 200) {
        toast.success(t('toasts.archivedUser', { name: user.name }))
        setReload(prev => prev + 1);
        setShowConfirmDelete(false);
      }
      else{
        toast.error(t('toasts.errorEditingUser'))
      }
    });

  };

  const deleteRole = (role: Role | null) => {
    if (role === null) return;
    fetch("/api/role", {method: "DELETE", headers: {"Content-Type": "application/json"}, body: JSON.stringify(role)})
    .then(res => {
      if (res.status === 200) {
        toast.success(t('toasts.deletedRole', { name: role.name }));
        setReload(prev => prev + 1);
        setShowConfirmDeleteRole(false);
      }
      else if (res.status === 409) {
        toast.info(t('toasts.changeRolesBeforeDelete'))
      }
      else{
        toast.error(t('toasts.errorEditingRole'))
      }
    })
  }

  const addUser = () => {
    const user = {
      email: (document.getElementById('email') as HTMLInputElement)?.value || '',
      name: (document.getElementById('name') as HTMLInputElement)?.value || '',
      user_role: (document.getElementById('role') as HTMLInputElement)?.value || '',
      lead_letter: (document.getElementById('letter') as HTMLInputElement)?.value || '',
      phone: (document.getElementById('phone') as HTMLInputElement)?.value || '',
      department_id: (document.getElementById('department') as HTMLInputElement)?.value || '',
    }
    fetch("/api/user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(user),
    }).then(res => {
      if (res.status === 200) {
        toast.success(t('toasts.addedUser', { name: user.name }))
        setReload(prev => prev + 1);
        setShowAddUser(false);
      }
    });

  };

  const updateUser = (userToUpdate: User) => {
    if (userToUpdate.role_id !== roles?.find((el: Role) => el.name === userToUpdate.user_role)?.id) userToUpdate.selectedAnotherRole = true;
    else userToUpdate.selectedAnotherRole = false;
    if (userToUpdate.newDepartment) {
      if (userToUpdate.newDepartment !== userToUpdate.department){
        userToUpdate.selectedAnotherDepartment = true;
        userToUpdate.department = userToUpdate.newDepartment;
      }
      else{
        userToUpdate.selectedAnotherDepartment = false;
      }
      userToUpdate.newDepartment = undefined;
    }
    setUsers((prev: User[]) => prev.map((user: User) => {
      return user.id === userToUpdate.id ? userToUpdate : user
    }))
  }

  const saveUser = (user: User) => {
    setLoading(true)
    fetch('/api/user', {method: 'PATCH', headers: {"Content-Type": "application/json"}, body: JSON.stringify({...user})}).then(res => {
      if (res.status === 200) {
        setReload(prev => prev + 1)
        toast.success(t('toasts.userSaved'))
      }
      else{
        toast.error(t('toasts.errorSavingUser'))
      }
      setReload(prev => prev + 1)
    })
  }


  const addRole = () => {
    if (selectedPermissionsNewRole?.filter((permission: SelectedPermission) => permission.selected === true).length === 0) {
      toast.error(t('toasts.selectPermission'))
      return;
    }
    const role = {
      name: (document.getElementById('new_role') as HTMLInputElement)?.value || '',
      permissions: selectedPermissionsNewRole,
    }
    fetch("/api/role", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(role),
    }).then(res => {
      if (res.status === 200) {
        toast.success(t('toasts.addedRole', {
          name: role.name,
          count: role.permissions?.filter((permission: SelectedPermission) => permission.selected === true).length ?? 0,
        }))
        setReload(prev => prev + 1);
        setShowAddRoleForm(false);
      }
    });
  }

  const editRole = () => {
    const role = {
      id: roleToEdit?.id,
      name: roleToEdit?.name,
      permissions: selectedPermissionsNewRole,
    }
    fetch("/api/role", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(role),
    }).then(res => {
      if (res.status === 200) {
        toast.success(t('toasts.editedRole', {
          name: role.name ?? '',
          count: role.permissions?.filter((permission: SelectedPermission) => permission.selected === true).length ?? 0,
        }))
        setReload(prev => prev + 1);
        setShowEditRoleForm(false);
      }
    });
  }

  const updateRole = (roleToUpdate: Role) => {
    setRoles(prev =>
      prev?.map((role: Role) => 
        role.id === roleToUpdate.id ? roleToUpdate : role
      )
    )
  }

  const giveUserAccess = (user: User | null) => {
    if (user === null) return;
    fetch("/api/user", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({...user, department: departments.find((dep: Department) => dep.name === user.department)?.id, archived: false}),
    }).then(res => {
      if (res.status === 200) {
        toast.success(t('toasts.userHasAccess', { name: user.name }))
        setReload(prev => prev + 1);
        setShowConfirmGiveAccess(false);
      }
    });

  };
 
  const changePermissions = (updatedPermission: SelectedPermission) => {
    setSelectedPermissionsNewRole((prev: any) => 
      prev.map((permission: any) => 
        permission.id === updatedPermission.id ? updatedPermission : permission
      )
    )
  }
  
  useEffect(() => {
    async function load() {
      setLoading(true)
      const me_res = await fetch("/api/me");
      const me_user = await me_res.json();
      setUser(me_user)

      setSelectedPermissionsNewRole(permissions.map((permission: Permission) => { return {...permission, selected: false} }))
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
          return Object.keys(b.permissions).filter(key => b.permissions[key] === true).length - Object.keys(a.permissions).filter(key => a.permissions[key] === true).length;})
      setUsers(users_data)

      let departments_res = await fetch("/api/departments");
      if (!departments_res.ok){
        console.error("Failed to load departments");
        setLoading(false)
        return;
      }
      let departments_data = await departments_res.json();
      departments_data = departments_data.filter((department: Department) => department.is_main === true)
      setDeparments(departments_data)
      
      let roles_res = await fetch("/api/roles");
      if (!roles_res.ok){
        console.error("Failed to load roles");
        setLoading(false);
        return;
      }
      let roles_data = await roles_res.json();
      roles_data = roles_data.sort((a: Role, b: Role) => Object.keys(b.permissions).filter(key => b.permissions[key] === true).length - Object.keys(a.permissions).filter(key => a.permissions[key] === true).length);
      setRoles(roles_data)


      setLoading(false)
    }
    load();
  }, [reload]);
  
  const searchParams = useSearchParams();
  const scrollToId = searchParams.get('scroll_to_id');
  const [highlightedUserId, setHighlightedUserId] = useState<string | null>(null);
  useEffect(() => {
    if (loading || !scrollToId || users.length === 0) return;

    const user = users.find(user => String(user.id) === scrollToId);
    if (!user) return;

    const userElement = document.getElementById(scrollToId);
    if (!userElement) return;

    userElement.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });


    const timeout_0 = setTimeout(() => {
      setHighlightedUserId(scrollToId);
    }, 800);
    // clearTimeout(timeout_0);
    const timeout_1 = setTimeout(() => {
      setHighlightedUserId(null);
    }, 2000);

    return () => clearTimeout(timeout_1);
  }, [loading, scrollToId, users]);  
  return (
    <div className="teams-and-roles">
      {loading ? (<Loader></Loader>) :
        (<div>
          {showConfirmDelete && (
            <div className='confirm'>
              <div>
                <h1>{t('confirm.archiveTitle')}</h1>
                <p>{t('confirm.archiveText')}</p>
                <div>
                  <div className='button-w-bl' onClick={() => {setShowConfirmDelete(false)}}>{t('common.cancel')}</div>
                  <div className='button-d-bl' onClick={() => {archiveUser(userToDelete)}}>{t('confirm.archiveButton')}</div>
                </div>
              </div>
            </div>
          )}
          {showConfirmDeleteRole && (
            <div className='confirm'>
              <div>
                <h1>{t('confirm.deleteRoleTitle')}</h1>
                <p>{t('toasts.changeRolesBeforeDelete')}</p>
                <div>
                  <div className='button-w-bl' onClick={() => {setShowConfirmDeleteRole(false)}}>{t('common.cancel')}</div>
                  <div className='button-d-bl' onClick={() => { deleteRole(roleToDelete) }}>{t('confirm.deleteRoleButton')}</div>
                </div>
              </div>
            </div>
          )}
          {showConfirmGiveAccess && (
            <div className='confirm'>
              <div>
                <h1>{t('confirm.giveAccessTitle')}</h1>
                <div>
                  <div className='button-w-bl' onClick={() => {setShowConfirmGiveAccess(false)}}>{t('common.cancel')}</div>
                  <div className='button-d-bl' onClick={() => {giveUserAccess(userToDelete)}}>{t('confirm.giveAccessButton')}</div>
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
                  <h1>{t('addUser.title')}</h1>
                  <div>
                    <label>
                      <div>{t('addUser.name')}</div>
                      <input style={{textTransform: 'none'}} type="text" id='name' required />
                    </label>
                    <label>
                      <div>{t('addUser.email')}</div>
                      <input style={{textTransform: 'none'}} type="email" id='email' required />
                    </label>
                    <label>
                      <div>{t('addUser.phone')}</div>
                      <input onChange={(e) => e.target.value = generatePhoneNumber(e.target.value)} type="phone" id='phone' pattern="^\+?[0-9\s\-()]{7,20}$" required />
                    </label>
                    <label>
                      <div>{t('addUser.role')}</div>
                      <select id='role' required >
                        {roles?.map(role => (<option key={`new_user_role_${role.id}`} value={role.id}>{capitalize(role.name)}</option>))}
                      </select>
                    </label>
                    <label>
                      <div>{t('addUser.employeeId')}</div>
                      <input type="text" id='letter' pattern="[A-Za-z][A-Za-z]" required defaultValue={randomEmployeeID()} />
                    </label>
                    <label>
                      <div>{t('addUser.department')}</div>
                      <select id='department'>
                        {departments.map((dep: Department) => (
                          <option key={`department_${dep.id}`} value={dep.id}>{dep.name}</option>
                        ))}
                      </select>
                    </label>
                  </div>


                  <div>
                    <div className='button-w-bl' onClick={() => {setShowAddUser(false)}}>{t('common.cancel')}</div>
                    <button className='button-d-bl' type='submit' form="add-user-form">{t('addUser.submit')}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {showAddRoleForm && (
            <div className='confirm add-role-form'>
              <div>
                <form id='add-role-form' onSubmit={(e) => {
                    e.preventDefault();
                    addRole();
                  }}>
                  <h1>{t('roleForm.createTitle')}</h1>
                  <div>
                    <label>
                      <div>{t('roleForm.name')}</div>
                      <input type="text" name='role' id='new_role' required />
                    </label>
                  </div>
                  <h3>{t('roleForm.permissionsIntro')}</h3>
                  <div style={{flexDirection: 'column'}}>
                    {selectedPermissionsNewRole && selectedPermissionsNewRole.map((permission: SelectedPermission) => (
                      <label key={`select_permission_role_${permission.id}`}>
                        <input type="checkbox" checked={permission.selected ?? false} onChange={(e) => {
                          changePermissions({...permission, selected: e.target.checked})
                        }} />
                        {permission.name}
                      </label>
                    ))}
                  </div>

                  <div>
                    <div className='button-w-bl' onClick={() => {setShowAddRoleForm(false)}}>{t('common.cancel')}</div>
                    <button className='button-d-bl' type='submit' form="add-role-form">{t('roleForm.addSubmit')}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {showEditRoleForm && (
            <div className='confirm add-role-form'>
              <div>
                <form id='add-role-form' onSubmit={(e) => {
                    e.preventDefault();
                    editRole();
                  }}>
                  <h1>{t('roleForm.editTitle')}</h1>
                  <div>
                    <label>
                      <div>{t('roleForm.name')}</div>
                      <input type="text" name='role' id='new_role' value={roleToEdit?.name} required onChange={(e) => {
                        if (roleToEdit){
                          setRoleToEdit({...roleToEdit, name: e.target.value})
                        }
                      }}/>
                    </label>
                  </div>
                  <h3>{t('roleForm.permissionsIntro')}</h3>
                  <div style={{flexDirection: 'column'}}>
                    {selectedPermissionsNewRole && selectedPermissionsNewRole.map((permission: SelectedPermission) => (
                      <label key={`select_permission_role_${permission.id}`}>
                        <input type="checkbox" checked={permission.selected ?? false} onChange={(e) => {
                          changePermissions({...permission, selected: e.target.checked})
                        }} />
                        {permission.name}
                      </label>
                    ))}
                  </div>

                  <div>
                    <div className='button-w-bl' onClick={() => {setShowEditRoleForm(false)}}>{t('common.cancel')}</div>
                    <button className='button-d-bl' type='submit' form="add-role-form">{t('roleForm.editSubmit')}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {me_user?.permissions.add_users && (<div className='button-d-bl-sm add-user' onClick={() => {setShowAddUser(true)}}>{t('addUser.button')}</div>)}
          <div className='employees-container'>
            {users.map(user => {
              return (
                <div key={`user_${user.id}`} id={user.id} className={[
                  'employee',
                  user.archived === true ? 'archived' : '',
                  highlightedUserId === String(user.id) ? 'highlighted' : '',
                ].filter(Boolean).join(' ')}>
                  <div>
                    <UserCircle user_name={user.name} size={40} />
                    <div>
                      <div>{user.name}</div>
                      <div>
                        <select defaultValue={roles?.find((el: Role) => el.name === user.user_role)?.id} onChange={(e) => {updateUser({...user, role_id: e.target.value})}} disabled={me_user?.id === user.id ? true : false} className={me_user?.id === user.id ? 'd' : ''}>
                          {roles?.map((role) => (
                            <option key={`update_role_${user.id}_${role.id}`} value={role.id}>{role.name}</option>
                          ))}
                        </select>
                        {user.selectedAnotherRole === true && (<div className='button-d-bl-sm' onClick={() => {saveUser({...user, department: departments.find((dep: Department) => dep.name === user.department)?.id || ""})}}>{t('common.save')}</div>)}
                      </div>
                      <div>
                        <select onChange={(e) => {updateUser({...user, newDepartment: e.target.value})}} defaultValue={departments.find((dep: Department) => dep.name === user.department)?.id} disabled={me_user?.id === user.id ? true : false} className={me_user?.id === user.id ? 'd' : ''} >
                          {departments.map((department: Department) => {
                            return (
                              <option key={`update_department_${user.id}_${department.id}`} value={department.id}>{department.name}</option>
                            )
                          })}
                        </select>
                        {user.selectedAnotherDepartment === true && (<div className='button-d-bl-sm' onClick={() => {saveUser(user)}}>{t('common.save')}</div>)}
                      </div>
                    </div>
                    <div>
                      <div className={user.user_role}>{`• ${user.user_role}`}</div>
                    </div>
                  </div>
                  {/* TODO: change selecting roles when adding new user */}
                  {/* TODO: add possibility to change roles */}
                  {/* TODO: create admin role */}
                  <div>
                    <div data-img="email">{user.email}</div>
                    <div data-img="phone">{user.phone}</div>
                  </div>
                  {user.user_role !== 'manager' ? (
                    <div>
                      <div>
                        <div>{briefs.filter((brief: SavedBrief) => brief.lead_id === user.id).length}</div>
                        <span>{t('employee.briefs')}</span>
                      </div>
                      <div>
                        <div>{briefs.filter((brief: SavedBrief) => brief.lead_id === user.id).reduce((a: number, brief: SavedBrief) => brief.findings ? brief.findings?.length + a : a, 0)}</div>
                        <span>{t('employee.findings')}</span>
                      </div>
                      <div>
                        <div>{briefs.filter((brief: SavedBrief) => brief.lead_id === user.id).reduce((a: number, brief: SavedBrief) => brief.tasks ? brief.tasks?.length + a : a, 0)}</div>
                        <span>{t('employee.tasks')}</span>
                      </div>
                    </div>
                  ) : (<div></div>)}
                  {me_user && me_user.permissions.archive_give_access_users && user.archived !== true && (
                    <div className='button-r-sm' style={{marginLeft: 'auto', marginTop: 15}} onClick={() => {
                      setUserToDelete(user);
                      setShowConfirmDelete(true)
                    }}>{t('confirm.archiveButton')}</div>
                  )}
                  {me_user && me_user.permissions.archive_give_access_users && user.archived === true && (
                    <div className='button-d-bl-sm' style={{marginLeft: 'auto', marginTop: 15}} onClick={() => {
                      setUserToDelete(user);
                      setShowConfirmGiveAccess(true)
                    }}>{t('confirm.giveAccessButton')}</div>
                  )}
                  {(!me_user || !me_user.permissions.archive_give_access_users) && (<div></div>)}
                </div>
              )
            })}
          </div>
          <div className="role-permissions">
            <div>
              <div>
                <h3>{t('rolePermissions.title')}</h3>
                <p>{t('rolePermissions.description')}</p>
              </div>
              {me_user?.permissions.add_roles && (<div className="button-d-bl-sm" onClick={() => setShowAddRoleForm(true)}>{t('rolePermissions.addRole')}</div>)}
            </div>
            <div>
              {roles && roles.map((role: Role) => (
                <div key={`role_${role.id}`}>
                  <div>
                    <div>
                      <h6>{role.name}</h6>
                      <span>{t('rolePermissions.members', { count: users.filter((user: User) => user.user_role === role.name).length })}</span>
                    </div>
                    <div className='button-d-bl-sm' onClick={() => {setShowEditRoleForm(true); setRoleToEdit(role);
                    setSelectedPermissionsNewRole(permissions.map((permission: Permission) => { return {...permission, selected: role.permissions[permission.js_name]} }))
                    }}>{t('common.edit')}</div>
                  </div>
                  {permissions && permissions.map((permission: Permission) => {
                    if (role.permissions[permission.js_name] === true) {
                      return (<p key={`role_${role.id}_permission_${permission.id}`}>{permission.name}</p>)
                    }
                  })}
                  {me_user?.permissions.add_roles && (<div className='button-r-sm' onClick={() => {setRoleToDelete(role); setShowConfirmDeleteRole(true)}}>{t('common.delete')}</div>)}
                </div>))}
            </div>
          </div>
        </div>)}
    </div>
  );
}