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
import capitalize from '@/lib/text';




export default function TeamsAndRoles() {
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
      body: JSON.stringify({...user, archived: true}),
    }).then(res => {
      if (res.status === 200) {
        toast.success(`Archived user "${user.name}"`)
        setReload(prev => prev + 1);
        setShowConfirmDelete(false);
      }
      else{
        toast.error('Error while editing user.')
      }
    });

  };

  const deleteRole = (role: Role | null) => {
    if (role === null) return;
    fetch("/api/role", {method: "DELETE", headers: {"Content-Type": "application/json"}, body: JSON.stringify(role)})
    .then(res => {
      console.log('res')
      console.log(res)
      if (res.status === 200) {
        toast.success(`Deleted Role ${role.name}`);
        setReload(prev => prev + 1);
        setShowConfirmDeleteRole(false);
      }
      else if (res.status === 409) {
        toast.info('Before deleting, change roles for users who has this role.')
      }
      else{
        toast.error('Error while editing role.')
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

  const updateUser = (userToUpdate: User) => {
    if (userToUpdate.role_id !== roles?.find((el: Role) => el.name === userToUpdate.user_role)?.id) userToUpdate.selectedAnotherRole = true;
    else userToUpdate.selectedAnotherRole = false;
    setUsers((prev: User[]) => prev.map((user: User) => {
      return user.id === userToUpdate.id ? userToUpdate : user
    }))
  }

  const saveUser = (user: User) => {
    setLoading(true)
    fetch('/api/user', {method: 'PATCH', headers: {"Content-Type": "application/json"}, body: JSON.stringify({...user})}).then(res => {
      if (res.status === 200) {
        setReload(prev => prev + 1)
        toast.success('User data saved successfully!')
      }
      else{
        toast.error('Error while saving user data. Try again later.')
      }
      setReload(prev => prev + 1)
    })
  }


  const addRole = () => {
    if (selectedPermissionsNewRole?.filter((permission: SelectedPermission) => permission.selected === true).length === 0) {
      toast.error('Select at least one permission.')
      return;
    }
    const role = {
      name: (document.getElementById('new_role') as HTMLInputElement)?.value || '',
      permissions: selectedPermissionsNewRole,
    }
    console.log('role')
    console.log(role)
    fetch("/api/role", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(role),
    }).then(res => {
      if (res.status === 200) {
        toast.success(`Added role "${role.name}" with ${role.permissions?.filter((permission: SelectedPermission) => permission.selected === true).length} permission`)
        setReload(prev => prev + 1);
        setShowAddRoleForm(false);
      }
    });
  }


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
      console.log('me_user')
      console.log(me_user)
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
      
      let roles_res = await fetch("/api/roles");
      if (!roles_res.ok){
        console.error("Failed to load roles");
        setLoading(false);
        return;
      }
      let roles_data = await roles_res.json();
      roles_data = roles_data.sort((a: Role, b: Role) => Object.keys(b.permissions).filter(key => b.permissions[key] === true).length - Object.keys(a.permissions).filter(key => a.permissions[key] === true).length);
      console.log('roles_data')
      console.log(roles_data)
      setRoles(roles_data)


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
          {showConfirmDeleteRole && (
            <div className='confirm'>
              <div>
                <h1>Confirm Deleting this Role?</h1>
                <p>Before deleting, change roles for users who has this role.</p>
                <div>
                  <div className='button-w-bl' onClick={() => {setShowConfirmDeleteRole(false)}}>Cancel</div>
                  <div className='button-d-bl' onClick={() => { deleteRole(roleToDelete) }}>Delete Role</div>
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
                        {roles?.map(role => (<option key={`new_user_role_${role.id}`} value={role.id}>{capitalize(role.name)}</option>))}
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
          {showAddRoleForm && (
            <div className='confirm add-role-form'>
              <div>
                <form id='add-role-form' onSubmit={(e) => {
                    e.preventDefault();
                    addRole();
                  }}>
                  <h1>Create new Role:</h1>
                  <div>
                    <label>
                      <div>Name</div>
                      <input type="text" name='role' id='new_role' required />
                    </label>
                  </div>
                  <h3>User with this role are able to:</h3>
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
                    <div className='button-w-bl' onClick={() => {setShowAddRoleForm(false)}}>Cancel</div>
                    <button className='button-d-bl' type='submit' form="add-role-form">Add new Role</button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {me_user?.permissions.add_users && (<div className='button-d-bl-sm add-user' onClick={() => {setShowAddUser(true)}}>Add User</div>)}
          <div className='employees-container'>
            {users.map(user => {
              console.log('user')
              console.log(user)
              return (
                <div key={`user_${user.id}`} className={user.archived === true ? 'employee archived' : 'employee'}>
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
                        {user.selectedAnotherRole === true && (<div className='button-d-bl-sm' onClick={() => {saveUser(user)}}>Save</div>)}
                      </div>

                      <div>{user.department}</div>
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
                  ) : (<div></div>)}
                  {me_user && me_user.permissions.archive_give_access_users && user.archived !== true && (
                    <div className='button-r-sm' style={{marginLeft: 'auto', marginTop: 15}} onClick={() => {
                      setUserToDelete(user);
                      setShowConfirmDelete(true)
                    }}>Archive User</div>
                  )}
                  {me_user && me_user.permissions.archive_give_access_users && user.archived === true && (
                    <div className='button-d-bl-sm' style={{marginLeft: 'auto', marginTop: 15}} onClick={() => {
                      setUserToDelete(user);
                      setShowConfirmGiveAccess(true)
                    }}>Give Access</div>
                  )}
                  {(!me_user || !me_user.permissions.archive_give_access_users) && (<div></div>)}
                </div>
              )
            })}
          </div>
          <div className="role-permissions">
            <div>
              <div>
                <h3>Role Permissions</h3>
                <p>What each role can see and do in the system</p>
              </div>
              {me_user?.permissions.add_roles && (<div className="button-d-bl-sm" onClick={() => setShowAddRoleForm(true)}>Add Role</div>)}
            </div>
            <div>
              {roles && roles.map((role: Role) => (
                <div key={`role_${role.id}`}>
                  <div>
                    <div>
                      <h6>{role.name}</h6>
                      <span>{users.filter((user: User) => user.user_role === role.name).length} member{users.filter((user: User) => user.user_role === role.name).length !== 1 ? 's' : ''}</span>
                    </div>
                    {/* <div className='button-d-bl-sm'>Edit</div> */}
                  </div>
                  {permissions && permissions.map((permission: Permission) => {
                    if (role.permissions[permission.js_name] === true) {
                      return (<p key={`role_${role.id}_permission_${permission.id}`}>{permission.name}</p>)
                    }
                  })}
                  {me_user?.permissions.add_roles && (<div className='button-r-sm' onClick={() => {setRoleToDelete(role); setShowConfirmDeleteRole(true)}}>Delete</div>)}
                </div>))}
            </div>
          </div>
        </div>)}
    </div>
  );
}
