"use client";

import { useEffect, useRef, useState } from 'react';
import './css/Chat.css'
import { useUser } from './UserProvider';
import { Message, NewMessage, UserForChat } from '@/lib/types';
import { format } from 'date-fns';
import UserCircle from './UserCircle';
import Loader from './Loader';

const Chat = () => {
    const [openChat, setOpenChat] = useState(false);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('');

    const user = useUser();
    const me_user = user;

    const [chats, setChats] = useState<Message[]>([]);
    const [users, setUsers] = useState<UserForChat[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);

    const messagesRef = useRef<HTMLDivElement>(null);
    const chatsRef = useRef<HTMLDivElement>(null);

    const [reloadChats, setReloadChats] = useState(0);
    const [reloadMessages, setReloadMessages] = useState(0);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [messageText, setMessageText] = useState('');

    const [scrollChats, setScrollChats] = useState(0);
    const [scrollMessages, setScrollMessages] = useState(false);

    const updateChat = async (user_to_update: UserForChat) => {
        if (user_to_update.open === true) {
            const chat_res = await fetch(`/api/chat?id_1=${user.id}&id_2=${user_to_update.id}`);

            if (!chat_res.ok) {
                console.error('Error while fetching chat messages');
                return;
            }
            const chat_data = await chat_res.json();
            console.log('messages')
            console.log(chat_data)
            setMessages(chat_data);
            setLoading(false);
        }
        setUsers(prev => prev.map((user: UserForChat) => 
            user.id === user_to_update.id ? user_to_update : user
        ))
    }

    const sendMessage = async (message: NewMessage) => {
        const chat_res = await fetch('/api/chat', {
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify(message)}
        )
        if (!chat_res.ok){
            console.error('Error while sending message');
            return;
        }
        setMessageText('');
        setReloadMessages(prev => prev + 1);
        setReloadChats(prev => prev + 1);
    }

    const updateMessage = async (message: Message) => {
        const chat_res = await fetch('/api/chat', {
            method: 'PATCH', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify(message)}
        )
        if (!chat_res.ok){
            console.error('Error while sending message');
            return;
        }
        setReloadMessages(prev => prev + 1);
        // setReloadChats(prev => prev + 1);
    }

    useEffect(() => {
        const load = async () => {

            const chat_res = await fetch(`/api/chats?id=${user.id}`);

            if (!chat_res.ok) {
                console.error('Error while fetching chat');
                return;
            }
            const chat_data = await chat_res.json();

            const users_res = await fetch('/api/users');

            if (!users_res.ok) {
                console.error('Error while fetching users');
                return;
            }
            console.log('chats');
            console.log(chat_data);

            let users_data = await users_res.json();
            users_data = users_data
                .filter((filterUser: UserForChat) => filterUser.id !== user.id)
                .sort((a: UserForChat, b: UserForChat) => {
                    let a_chat = chat_data.find((message: Message) => (message.to_user === a.id && message.from_user === user.id) || (message.from_user === a.id && message.to_user === user.id));
                    let b_chat = chat_data.find((message: Message) => (message.to_user === b.id && message.from_user === user.id) || (message.from_user === b.id && message.to_user === user.id));
                    return (b_chat?.timestamp? new Date(b_chat.timestamp).getTime() : 0) - (a_chat?.timestamp? new Date(a_chat.timestamp).getTime() : 0) !== 0 ? 
                                (b_chat?.timestamp? new Date(b_chat.timestamp).getTime() : 0) - (a_chat?.timestamp? new Date(a_chat.timestamp).getTime() : 0) 
                                : a.name.localeCompare(b.name);
                })
            setUsers(users_data);
            setChats(chat_data);
        }

        load();
    }, [])

    useEffect(() => {
        const load = async () => {
            if (selectedUserId !== null) {
                const chat_res = await fetch(`/api/chat?id_1=${user.id}&id_2=${selectedUserId}`);

                if (!chat_res.ok) {
                    console.error('Error while fetching chat messages');
                    return;
                }

                const chat_data = await chat_res.json();
                console.log('messages')
                console.log(chat_data)
                setLoading(false);
                if (scrollMessages || messages.length !== chat_data.length) {
                    setScrollMessages(prev => !prev);
                    // setScrollMessages(false);
                }
                setMessages(chat_data);
                if (chat_data.length > 0 && user.id === chat_data[chat_data.length - 1].to_user) {
                    const lastMessage = chat_data[chat_data.length - 1];
                    updateMessage({...lastMessage, read: true})
                    
                }
            }
        }

        load();
    }, [reloadMessages]);

    useEffect(() => {
        const load = async () => {
            const selected_user = users.find((user: UserForChat) => user.id === selectedUserId );
                const chat_res = await fetch(`/api/chats?id=${user.id}`);

                if (!chat_res.ok) {
                    console.error('Error while fetching chat');
                    return;
                }
                const chat_data = await chat_res.json();
                const users_res = await fetch('/api/users');

                if (!users_res.ok) {
                    console.error('Error while fetching users');
                    return;
                }
                let users_data = await users_res.json();
                users_data = users_data
                    .filter((filterUser: UserForChat) => filterUser.id !== user.id)
                    .sort((a: UserForChat, b: UserForChat) => {
                        let a_chat = chat_data.find((message: Message) => (message.to_user === a.id && message.from_user === user.id) || (message.from_user === a.id && message.to_user === user.id));
                        let b_chat = chat_data.find((message: Message) => (message.to_user === b.id && message.from_user === user.id) || (message.from_user === b.id && message.to_user === user.id));
                        return (b_chat?.timestamp? new Date(b_chat.timestamp).getTime() : 0) - (a_chat?.timestamp? new Date(a_chat.timestamp).getTime() : 0) !== 0 ? 
                                    (b_chat?.timestamp? new Date(b_chat.timestamp).getTime() : 0) - (a_chat?.timestamp? new Date(a_chat.timestamp).getTime() : 0) 
                                    : a.name.localeCompare(b.name);
                    })
                if (selected_user) {
                    users_data = users_data.map((user: UserForChat) => {
                        return user.id === selected_user.id ? {...user, open: true} : user
                    })
                }
                setUsers(users_data);
                setChats(chat_data);
            }
        load();
    }, [reloadChats])

    useEffect(() => {
        requestAnimationFrame(() => {
            if (messagesRef.current) {
                messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
            }
        });
    }, [scrollMessages]);

    useEffect(() => {
        requestAnimationFrame(() => {
            if (chatsRef.current) {
                chatsRef.current.scrollTop = 0;
            }
        });
    }, [scrollChats]);

    useEffect(() => {
        const interval = setInterval(() => {
            setReloadChats(prev => prev + 1);
            setReloadMessages(prev => prev + 1);
        }, 3000);

        return () => clearInterval(interval);
    }, [])
    return (
        <div className="chat">
            {openChat ? (
                <div>
                    <div>
                        <div>{selectedUserId
                                ? (
                                    <div>
                                        <div>Messages with</div>
                                        <UserCircle user_name={users.find((user: UserForChat) => user.id === selectedUserId)?.name ?? ''} size={25}></UserCircle>
                                        <div>{users.find((user: UserForChat) => user.id === selectedUserId)?.name}</div>
                                    </div>
                                )
                                : 'All Messages'}</div>
                        <div onClick={() => setOpenChat(false)}>x</div>
                    </div>
                    <div>
                        {selectedUserId  
                            ? (
                                <div>
                                    <div onClick={() => {
                                        setMessageText('');
                                        setSelectedUserId(null);
                                        setScrollChats(prev => prev + 1);
                                    }}
                                    >
                                        {`< Back`}
                                    </div>
                                    {loading === true ? (<div className='messages loader'><Loader></Loader></div>) : (
                                        <div className='messages' ref={messagesRef}>
                                            
                                            {messages.length > 0 
                                                ? messages.map((message: Message) => (
                                                    <div key={message.id} className={message.from_user === user.id ? 'right' : 'left'}>
                                                        <div>{message.text}</div>
                                                        <div>{format(message.timestamp, 'hh:mm aa, MM-dd-yyyy')}</div>
                                                    </div>
                                                ))
                                                : (<p>Send first message in this chat!</p>)
                                            }
                                        </div>
                                    )}
                                    <div className='flex j-s-b'>
                                        <input type="text" value={messageText} placeholder='Message text...' onChange={(e) => setMessageText(e.target.value)}
                                        onKeyDown={(e) => {
                                                console.log(e.key)
                                                if (e.key === 'Enter') {
                                                    sendMessage({
                                                        text: messageText,
                                                        from_user: user.id,
                                                        to_user: users.find((user: UserForChat) => user.id === selectedUserId )?.id ?? '',
                                                        timestamp: new Date(),
                                                    });
                                                }
                                            }}/>
                                        <div className="button-d-bl-sm" onClick={() => {
                                            sendMessage({
                                                text: messageText,
                                                from_user: user.id,
                                                to_user: users.find((user: UserForChat) => user.id === selectedUserId )?.id ?? '',
                                                timestamp: new Date(),
                                            })
                                        }}
                                        >Send</div>
                                    </div>
                                </div>)
                            : (
                                <div>
                                    <div>
                                        <input type="text" name="" id="" value={filter} onChange={(e) => {setFilter(e.target.value)}} placeholder='Input user name to filter here...' className='filter'/>
                                    </div>
                                    <div className='chats' ref={chatsRef}>
                                        {users
                                            .map((user: UserForChat) => {
                                            if (filter === '' || user.name.toLowerCase().includes(filter.toLowerCase()))
                                            return (
                                                <div key={user.id} className='flex j-s-b' onClick={() => {
                                                        setSelectedUserId(user.id);
                                                        setLoading(true);
                                                        const message = chats.find(
                                                            message =>
                                                                (message.to_user === user.id && message.from_user === me_user.id) ||
                                                                (message.from_user === user.id && message.to_user === me_user.id)
                                                        );

                                                        if (message?.read === false) {
                                                            updateMessage({
                                                                ...message,
                                                                read: true
                                                            });
                                                        }

                                                        setScrollMessages(true);

                                                    }}>
                                                    <div className={chats.find((message: Message) => message.to_user === me_user.id && message.from_user === user.id)?.read === true 
                                                                    || !chats.find((message: Message) => message.to_user === me_user.id && message.from_user === user.id) ? "flex" : "unread flex"}>
                                                        <UserCircle user_name={user.name} size={25}></UserCircle>
                                                        <div>{user.name}</div>
                                                    </div>
                                                    <div>
                                                        <div>
                                                            {chats
                                                                .sort((a: Message, b: Message) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                                                                .find((message: Message) => message.to_user === user.id || message.from_user === user.id)?.text}
                                                        </div>
                                                        <div>
                                                            {chats
                                                                .sort((a: Message, b: Message) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                                                                .find((message: Message) => message.to_user === user.id || message.from_user === user.id)?.timestamp ? 
                                                                    format(chats
                                                                    .sort((a: Message, b: Message) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                                                                    .find((message: Message) => message.to_user === user.id || message.from_user === user.id)?.timestamp ?? '', 'hh:mm aa, MM-dd-yyyy')
                                                                : ''}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}

                                    </div>
                                </div>
                            )}
                    </div>
                </div>
            ) : (
                <span onClick={() => setOpenChat(true)} className={chats.filter((message: Message) => message.read === false).length > 0 ? "unread" : ""}></span>
            )}
        </div>
    )
}

// TODO: MAYBE ADD LOADER WHEN LOADING MESSAGE
// TODO: MAYBE ADD LATER A POSSIBILTY TO ATTACH IMAGES AND OR FILES (FIND OUT HOW MUCH WILL COST STORE FILES ON VERCEL)

export default Chat;