import { User } from '@/lib/types';
import './css/MentionsHelper.css';
import UserCircle from './UserCircle';

type MentionsHelperProps = {
    users: User[];
    value: string;
    cursorPosition: number;
    onSelect: (user: User, start: number, end: number) => void;
    isFocused: boolean;
};

const MentionsHelper = ({ users, value, cursorPosition, onSelect, isFocused }: MentionsHelperProps) => {
    if (!isFocused) return null;

    const match = value.slice(0, cursorPosition).match(/(?:^|\s)@([^\s@]*)$/);

    if (!match) return null;
    const query = match[1].toLowerCase();

    const mentionStart = cursorPosition - match[0].length + match[0].lastIndexOf('@');
    let filteredUsers = users.filter(user => user.name?.toLowerCase().startsWith(query));
    filteredUsers = filteredUsers.sort((a: User, b: User) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))

    if (filteredUsers.length === 0) return null;
    return (
        <div className="mentions-helper">
            {filteredUsers.map(user => (
                <button
                    key={user.id}
                    type="button"
                    className="mention-option"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                        onSelect(user, mentionStart, cursorPosition);
                    }} >
                    <UserCircle user_name={user.name} size={20}></UserCircle>

                    <span>{user.name}</span>
                </button>
            ))}
        </div>
    );
};

export default MentionsHelper;