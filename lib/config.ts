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
        {id: 17, name: "See Production Dashboard", js_name: "see_production_dashboard"},                //done
        {id: 18, name: "Send messages to all employees at once", js_name: "send_messages_to_all"},      //done
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


export default getReportsTypes;