"use client";

import { useEffect, useState } from 'react';
import './css/Chat.css'
import { useUser } from './UserProvider';
import { Message, UserForChat } from '@/lib/types';

const Chat = () => {
    const [openChat, setOpenChat] = useState(false);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('');

    const user = useUser();

    const [chats, setChats] = useState<Message[]>([]);
    const [users, setUsers] = useState<UserForChat[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);



    const updateUser = async (user_to_update: UserForChat) => {
        if (user_to_update.open === true) {
            const chat_res = await fetch(`/api/chat?id_1=${user.id}&id_2=${user_to_update.id}`);

            if (!chat_res.ok) {
                console.error('Error while fetching chat messages');
                setLoading(false);
                return;
            }
            const chat_data = await chat_res.json();
            setMessages(chat_data);
        }
        setUsers(prev => prev.map((user: UserForChat) => 
            user.id === user_to_update.id ? user_to_update : user
        ))
    }
    useEffect(() => {
        const load = async () => {
            setLoading(true);

            const chat_res = await fetch(`/api/chats?id=${user.id}`);

            if (!chat_res.ok) {
                console.error('Error while fetching chat');
                setLoading(false);
                return;
            }
            const chat_data = await chat_res.json();

            const users_res = await fetch('/api/users');

            if (!users_res.ok) {
                console.error('Error while fetching users');
                setLoading(false);
                return;
            }

            let users_data = await users_res.json();
            users_data = users_data
                .filter((filterUser: UserForChat) => filterUser.id !== user.id)
                .sort((a: UserForChat, b: UserForChat) => a.name.localeCompare(b.name));
            setUsers(users_data);

            console.log('chat_data');
            console.log(chat_data);
            setChats(chat_data);

            setLoading(false);
        }
        load();
    }, [])
    return (
        <div className="chat">
            {openChat ? (
                <div>
                    <div>
                        <div>All Messages</div>
                        <div onClick={() => setOpenChat(false)}>x</div>
                    </div>
                    <div>
                        {users.filter((user: UserForChat) => user.open === true ).length > 0  
                            ? (
                                <div>
                                    <div onClick={() => {
                                        const openUserChat = users.find((user: UserForChat) => user.open === true);
                                        if (!openUserChat) return;
                                        updateUser({...openUserChat, open: false})}}
                                    >
                                        {`< Back`}
                                    </div>
                                    <div className='messages'>
                                        {messages.map((message: Message) => (
                                            <div key={message.id} className={message.from_user === user.id ? 'right' : 'left'}>{message.text}</div>
                                        ))}
                                    </div>
                                </div>) 
                            : users.map((user: UserForChat) => {
                                if (filter === '' || user.name.includes(filter))
                                return (
                                    <div key={user.id} className='flex j-s-b' onClick={() => {updateUser({...user, open: true})}}>
                                        <div>{user.name}</div>
                                        <div>{chats
                                            .sort((a: Message, b: Message) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                                            .find((message: Message) => message.to_user === user.id || message.from_user === user.id)?.text}</div>
                                        <div>{user.open}</div>
                                    </div>
                                )
                        })}
                    </div>
                </div>
            ) : (
                <span onClick={() => setOpenChat(true)}></span>
            )}
        </div>
    )
}

// TODO: SORT BY LAST MESSAGE TIMESTAMP
// TODO: ADD LOADER WHEN LOADING MESSAGE
// MAYBE ADD LATER A POSSIBILTY TO ATTACH IMAGES AND OR FILES (FIND OUT HOW MUCH WILL COST STORE FILES ON VERCEL)

export default Chat;