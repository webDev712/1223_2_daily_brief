import capitalize from "./text"

const getReportsTypes = () => {
    return [
        "Daily Brief",
        "SMRT",
        "Armoire Sheet",
        "Invenasset",
        "Google Sheets",
        "Email",
        "90 IO",
        "WB",
        "Fleetio",
        "Paycom",
        "MP Dashboard",
        "Other",
    ]
}


export const getWeekDays = () => {
    return [
        {full: 'Sunday', small: 'Sun'},
        {full: 'Monday', small: 'Mon'},
        {full: 'Tuesday', small: 'Tue'},
        {full: 'Wednesday', small: 'Wed'},
        {full: 'Thursday', small: 'Thu'},
        {full: 'Friday', small: 'Fri'},
        {full: 'Saturday', small: 'Sat'},
    ]
}


export const getRoles = (role: string) => {
    // switch (role){
    //     case 'lead':
    //         return 'Route Lead'
    //     case 'manager':
    //         return 'Route Manager'
    // }
    return capitalize(role);
}

export const getPermissions = () => {
    return [
        {id: 1, name: "Daily Brief: See their brief", js_name: "see_brief"},                                         //done
        {id: 2, name: "Daily Brief: Update their brief", js_name: "update_brief"},                                   //done
        {id: 3, name: "Daily Brief: Handoff their brief", js_name: "handoff_brief"},                                 //done
        {id: 4, name: "Daily Brief: See all briefs", js_name: "see_all_briefs"},                                     //done
        {id: 23, name: "Daily Brief: Reassign other users reports on Daily Brief page", js_name: "reasign_reports"}, //done
        {id: 5, name: "Dashboard: See Dashboard page", js_name: "see_dashboard"},                                  //done
        {id: 6, name: "Brief History: See Briefs history page", js_name: "see_briefs_history"},                        //done
        {id: 7, name: "Reports: See Reports page", js_name: "see_reports_page"},                                 //done
        {id: 8, name: "Reports: Edit reports", js_name: "edit_reports"},                                         //done
        {id: 9, name: "Team & Roles: See Team & Roles page", js_name: "see_team_roles"},                              //done
        {id: 10, name: "Team & Roles: Archive and give access back to users", js_name: "archive_give_access_users"},  //done
        {id: 11, name: "Team & Roles: Add users", js_name: "add_users"},                                              //done
        {id: 12, name: "Team & Roles: Add roles", js_name: "add_roles"},                                              //done
        {id: 17, name: "Produtction Dashboard: See Production Dashboard", js_name: "see_production_dashboard"},                //done
        {id: 18, name: "Chat: Send messages to all employees at once", js_name: "send_messages_to_all"},      //done
        {id: 19, name: "Chat: See other employees` messages", js_name: "see_other_employees_messages"},       //done
        {id: 21, name: "Action Tracker: Edit Action Tracker data", js_name: "edit_action_tracker"},                     //done
        {id: 22, name: "Action Tracker: Add Actions to Issues / Observations", js_name: "add_actions_to_io"},           //done
        {id: 13, name: "Settings: See Profile settings page", js_name: "see_profile_settings"},                   //done
        {id: 14, name: "Settings: Edit Profile settings", js_name: "edit_profile_settings"},                      //done
        {id: 15, name: "Settings: See Application settings page", js_name: "see_app_settings"},                   //done
        {id: 16, name: "Settings: Edit Application settings", js_name: "edit_app_settings"},                      //TODO-TODO-TODO
        {id: 24, name: "Settings: Manage Company Configuration", js_name: "manage_configuration"},                //done
    ]
}

export const getTestEmployees = () => {
    return [
        { id: 13, name: 'Alejandro M'},
        { id: 327, name: 'Alma V'},
        { id: 373, name: 'Alvarado, Yuritzi'},
        { id: 83, name: 'Alzate-soto, Daniela'},
        { id: 249, name: 'Anayeli G'},
        { id: 225, name: 'Antony S'},
        { id: 261, name: 'Ariel R'},
        { id: 172, name: 'Baoling Y'},
        { id: 352, name: 'Bembry, Gavona'},
        { id: 31, name: 'Bing Lun T'},
        { id: 17, name: 'Brandon G'},
        { id: 292, name: 'Brandt M'},
        { id: 208, name: 'Brenda D'},
        { id: 7, name: 'Carlos C'},
        { id: 343, name: 'Carlos W'},
        { id: 289, name: 'Cassie B'},
        { id: 236, name: 'Cindy F'},
        { id: 356, name: 'Cortez, Jimmy'},
        { id: 269, name: 'Danijay W'},
        { id: 369, name: 'Dawson, Elijah'},
        { id: 334, name: 'Delint A'},
        { id: 331, name: 'Delint B'},
        { id: 333, name: 'Delint M'},
        { id: 332, name: 'Delint M'},
        { id: 336, name: 'Delint S'},
        { id: 328, name: 'Dlint E'},
        { id: 330, name: 'Dlint L'},
        { id: 329, name: 'Dlint M'},
        { id: 283, name: 'Doricela P'},
        { id: 90, name: 'Dylan C'},
        { id: 296, name: 'Elijah D'},
        { id: 286, name: 'Elisha S'},
        { id: 321, name: 'Emerson S'},
        { id: 229, name: 'Erick V'},
        { id: 134, name: 'Erika C'},
        { id: 183, name: 'Evelyn Z'},
        { id: 351, name: 'Evelynzepeda, Delint'},
        { id: 235, name: 'Everardo L'},
        { id: 270, name: 'Francisco A'},
        { id: 21, name: 'Francisco J'},
        { id: 214, name: 'Gabriel P'},
        { id: 125, name: 'Genesis D'},
        { id: 338, name: 'Graciela N'},
        { id: 243, name: 'Hanna R'},
        { id: 354, name: 'Hernandez, Abby'},
        { id: 368, name: 'Herrera, Alejandro'},
        { id: 337, name: 'Isabel R'},
        { id: 302, name: 'Ivan H'},
        { id: 291, name: 'J S'},
        { id: 143, name: 'James W'},
        { id: 6, name: 'Janae W'},
        { id: 294, name: 'Jennifer M'},
        { id: 363, name: 'Jimenez, Francisco'},
        { id: 279, name: 'Jonatan U'},
        { id: 5, name: 'Jonni M'},
        { id: 238, name: 'Jorge E'},
        { id: 82, name: 'Jose P'},
        { id: 267, name: 'Juana R'},
        { id: 280, name: 'Julio F'},
        { id: 335, name: 'Karely F'},
        { id: 19, name: 'Karina H'},
        { id: 281, name: 'Karla C'},
        { id: 295, name: 'Karla P'},
        { id: 310, name: 'Katie C'},
        { id: 4, name: 'Kendall S'},
        { id: 163, name: 'Kevin L'},
        { id: 277, name: 'Kyler E'},
        { id: 148, name: 'Lidia D'},
        { id: 308, name: 'Liliana R'},
        { id: 187, name: 'Lopez-vargas, Vanessa'},
        { id: 188, name: 'Luis A'},
        { id: 141, name: 'Ma E'},
        { id: 365, name: 'Maldonado helenas, Andrea'},
        { id: 364, name: 'Maldonado, Andrea'},
        { id: 313, name: 'Maria M'},
        { id: 287, name: 'Maricarmen A'},
        { id: 12, name: 'Marisela C'},
        { id: 298, name: 'Mary C'},
        { id: 366, name: 'Mendoz, Charlot'},
        { id: 370, name: 'Mendoza, Elena'},
        { id: 309, name: 'Mericia A'},
        { id: 299, name: 'Michael M'},
        { id: 375, name: 'Morales, Norberto'},
        { id: 361, name: 'Najera, Edwin'},
        { id: 266, name: 'Nelly L'},
        { id: 371, name: 'No, Yulissa'},
        { id: 300, name: 'Np C'},
        { id: 357, name: 'Nunez, Martina'},
        { id: 3, name: 'Nye, Josh'},
        { id: 348, name: 'Orozco nunez, Martina'},
        { id: 306, name: 'Paulo F'},
        { id: 319, name: 'Pawandeep P'},
        { id: 350, name: 'Perez, Sandra'},
        { id: 84, name: 'Raquel S'},
        { id: 324, name: 'Raquel W'},
        { id: 227, name: 'Rudy Q'},
        { id: 345, name: 'Sam, Brenda'},
        { id: 346, name: 'Sam, Lidia'},
        { id: 27, name: 'Santos M'},
        { id: 209, name: 'Sean L'},
        { id: 107, name: 'Serafin S'},
        { id: 339, name: 'Smrt C'},
        { id: 353, name: 'Solis, Lizbeth'},
        { id: 315, name: 'Strauss, Sam'},
        { id: 222, name: 'Summer A'},
        { id: 323, name: 'Sweaters, Evelyn'},
        { id: 344, name: 'Team 2, Sam'},
        { id: 372, name: 'Tercero, Juan'},
        { id: 80, name: 'Test, Smrt'},
        { id: 374, name: 'Trejos, Carlos'},
        { id: 342, name: 'Ventura, Sara'},
        { id: 340, name: 'Vince S'},
        { id: 349, name: 'Vivero, Elizabeth'},
        { id: 230, name: 'Washbox E'},
        { id: 2, name: 'Will W'},
        { id: 320, name: 'William G'},
        { id: 22, name: 'Yanwen L'},
        { id: 303, name: 'Yoryani C'},
        { id: 217, name: 'Zar S'},
        { id: 171, name: 'Zaydi B'},
    ]
}

export const getActionLogCategories = () => {
    return [
        {id: 1, name: "Staffing / Attendance",},
        {id: 2, name: "Training & Skill Development",},
        {id: 3, name: "Equipment / Maintenance",},
        {id: 4, name: "Process Deviation",},
        {id: 5, name: "Quality Control",},
        {id: 6, name: "Safety / Risk",},
        {id: 7, name: "Customer / Account Impact",},
        {id: 8, name: "Volume / Forecasting",},
        {id: 9, name: "Housekeeping / Standards",},
        {id: 10 ,name: "SMRT ",},
        {id: 11 ,name: "Metalprogetti",},
        {id: 12 ,name: "Invenasset",},
        {id: 13 ,name: "Communication",},
    ]
}


export const getTutorials = () => {
    return [
        {
            id: 0,
            title: "Daily Brief - Demo",
            duration: "2:19",
            youtubeId: "k4rpq0KEeC4",
            description: "Daily Brief — Complete System Overview | User Guide. Discover the Daily Brief system and learn how to use its main features to manage daily operations, streamline reporting, and improve team collaboration.",
        },
        {
            id: 1,
            title: "Daily Brief: 1. Daily Brief Page",
            duration: "3:06",
            youtubeId: "gT3qJbogl2s",
            description: "Learn how to use the Daily Brief page to manage your daily shift. This video covers creating briefs, completing reports, managing tasks and findings, assigning report holders, and handing off briefs to other team members when needed.",
        },
        {
            id: 2,
            title: "Daily Brief: 2. Dashboard Page",
            duration: "1:05",
            youtubeId: "P9w3GVoJ5PY",
            description: "Discover how to use the Dashboard to monitor daily operations at a glance. Learn how to navigate between dates and review submitted briefs, reports reviewed, open findings, tasks, handed-off briefs, items requiring attention, and completed tasks across the team.",
        },
        {
            id: 3,
            title: "Daily Brief: 3. Brief History Page",
            duration: "1:18",
            youtubeId: "ZioEQi7aFRk",
            description: "Learn how to access and review previously created daily briefs. This video explains how to filter briefs by user, status, and time period, use summary blocks to find specific briefs, and review the findings and tasks recorded in each brief.",
        },
        {
            id: 4,
            title: "Daily Brief: 4. Reports Page",
            duration: "2:01",
            youtubeId: "nzmWATcgrNw",
            description: "Learn how to create, search for, and edit reports in Daily Brief. This video covers report settings, metric types, reporting periods, day times, default holders, and backup holders, including how to schedule report responsibilities for specific days of the week.",
        },
        {
            id: 5,
            title: "Daily Brief: 5. Team & Roles Page",
            duration: "1:30",
            youtubeId: "zBOqmS7XFtY",
            description: "Discover how managers can manage team members and control access to Daily Brief. Learn how to archive users, restore their access, change department assignments, update user roles, and configure role permissions using the Role Editor.",
        },
        {
            id: 6,
            title: "Daily Brief: 6. Action Tracker Page",
            duration: "1:59",
            youtubeId: "HYLGDhHCRDU",
            description: "Learn how to use the Production Dashboard to review production-related information and performance metrics. This video introduces the dashboard and explains how it can help users monitor operational performance and identify areas requiring attention.",
        },
        {
            id: 7,
            title: "Daily Brief: 7. Settings Page",
            duration: "0:59",
            youtubeId: "RQGxR-H2eNU",
            description: "Explore the Settings page and learn how to manage your personal information, configure departments and shifts, and access company settings. The video also covers data download and deletion options available to users with the appropriate permissions.",
        },
        {
            id: 8,
            title: "Daily Brief: 8. Chat",
            duration: "1:32",
            youtubeId: "l9nDi51Yh7A",
            description: "Learn how to communicate with your team directly within Daily Brief. This video covers sending messages and images, reviewing conversations, receiving notifications about Daily Brief and Action Tracker activities, and sending messages to all users or selected groups with the appropriate permissions.",
        },
    ];
}

export default getReportsTypes;