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


export const getRoles = (role: 'manager' | 'lead') => {
    switch (role){
        case 'lead':
            return 'Route Lead'
        case 'manager':
            return 'Route Manager'
    }
    return '-'
}


export default getReportsTypes;