import capitalize from "./text"

const getReportsTypes = () => {
    return [
        'Ops',
        'SMRT',
        'Fleet',
        'Other'
    ]
}


export const getWeekDays = () => {
    return [
        {full: 'Sunday', small: 'Sun'},
        {full: 'Monday', small: 'Md'},
        {full: 'Tuesday', small: 'Tue'},
        {full: 'Wednesday', small: 'Wed'},
        {full: 'Thursday', small: 'Th'},
        {full: 'Friday', small: 'Fr'},
        {full: 'Saturday', small: 'Sat'},
    ]
}


export const getRoles = (role: string) => {
    switch (role){
        case 'lead':
            return 'Route Lead'
        case 'manager':
            return 'Route Manager'
    }
    return capitalize(role);
}

export const getPermissions = () => {
    return [
        {id: 1, name: "See their brief", js_name: "see_brief"},                                         //done
        {id: 2, name: "Update their brief", js_name: "update_brief"},                                   //done
        {id: 3, name: "Handoff their brief", js_name: "handoff_brief"},                                 //done
        {id: 4, name: "See all briefs", js_name: "see_all_briefs"},                                     //done
        {id: 5, name: "See Dashboard page", js_name: "see_dashboard"},                                  //done
        {id: 6, name: "See Briefs history page", js_name: "see_briefs_history"},                        //done
        {id: 7, name: "See Reports page", js_name: "see_reports_page"},                                 //done
        {id: 8, name: "Edit reports", js_name: "edit_reports"},                                         //done
        {id: 9, name: "See Team & Roles page", js_name: "see_team_roles"},                              //done
        {id: 10, name: "Archive and give access back to users", js_name: "archive_give_access_users"},  //done
        {id: 11, name: "Add users", js_name: "add_users"},                                              //done
        {id: 12, name: "Add roles", js_name: "add_roles"},                                              //done
        {id: 13, name: "See Profile settings page", js_name: "see_profile_settings"},                   //done
        {id: 14, name: "Edit Profile settings", js_name: "edit_profile_settings"},                      //done
        {id: 15, name: "See Application settings page", js_name: "see_app_settings"},                   //done
        {id: 16, name: "Edit Application settings", js_name: "edit_app_settings"},                      //TODO-TODO-TODO
    ]
}


export default getReportsTypes;