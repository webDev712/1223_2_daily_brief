"use client";

import { useEffect, useRef, useState } from 'react';
import './css/Chat.css'
import { useUser } from './UserProvider';
import { Message, NewMessage, UserForChat, User } from '@/lib/types';
import { format } from 'date-fns';
import UserCircle from './UserCircle';
import Loader from './Loader';
import { toast } from 'sonner';

const Chat = () => {
    const [openChat, setOpenChat] = useState(false);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('');

    const me_user = useUser();

    const [chats, setChats] = useState<Message[]>([]);
    const [users, setUsers] = useState<UserForChat[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);

    const messagesRef = useRef<HTMLDivElement>(null);
    const chatsRef = useRef<HTMLDivElement>(null);

    const [reloadChats, setReloadChats] = useState(0);
    const [reloadMessages, setReloadMessages] = useState(0);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [messageText, setMessageText] = useState('');
    const [seeUserMessageAs, setSeeUserMessageAs] = useState<User>(me_user);

    const [showSendMessageToAll, setShowSendMessageToAll] = useState(false);

    const [scrollChats, setScrollChats] = useState(0);
    const [scrollMessages, setScrollMessages] = useState(false);


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
        // setReloadMessages(prev => prev + 1);
        // setReloadChats(prev => prev + 1);
    }

    const sendMessageToAll = async () => {
        const textareaElement = (document.getElementById('message-to-all')) as HTMLTextAreaElement;
        if (!textareaElement) return;
        const chats_res = await fetch('/api/chats', {
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({id: seeUserMessageAs.id, text: `NOTIFICATION: ${textareaElement.value || '-'}`, timestamp: new Date()})
        })
        if (!chats_res.ok){
            console.error('Error while sending message');
            toast.error(`Error while sending message to all employees. Refresh the page and try once more`)
            return;
        }
        setReloadMessages(prev => prev + 1);
        setReloadChats(prev => prev + 1);
        const chats_json = await chats_res.json();
        toast.success(`Success! Message sent to ${chats_json.rows.length} users!`)
        setShowSendMessageToAll(false);

    }

    
    const openChatById = (id: string) => {
        setSelectedUserId(id);
        setLoading(true);
        const message = chats.find(
            message =>
                (message.to_user === id && message.from_user === seeUserMessageAs.id) ||
                (message.from_user === id && message.to_user === seeUserMessageAs.id)
        );

        if (message?.read === false) {
            updateMessage({
                ...message,
                read: true
            });
        }

        setScrollMessages(true);
    }

    useEffect(() => {
        const load = async () => {

            const chat_res = await fetch(`/api/chats?id=${seeUserMessageAs.id}`);

            if (!chat_res.ok) {
                console.log('Error while fetching chat');
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
                .filter((filterUser: UserForChat) => filterUser.id !== seeUserMessageAs.id)
                .sort((a: UserForChat, b: UserForChat) => {
                    let a_chat = chat_data.find((message: Message) => (message.to_user === a.id && message.from_user === seeUserMessageAs.id) || (message.from_user === a.id && message.to_user === seeUserMessageAs.id));
                    let b_chat = chat_data.find((message: Message) => (message.to_user === b.id && message.from_user === seeUserMessageAs.id) || (message.from_user === b.id && message.to_user === seeUserMessageAs.id));
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
                const chat_res = await fetch(`/api/chat?id_1=${seeUserMessageAs.id}&id_2=${selectedUserId}`);

                if (!chat_res.ok) {
                    console.error('Error while fetching chat messages');
                    return;
                }

                const chat_data = await chat_res.json();
                console.log('messages')
                console.log(chat_data)
                if (scrollMessages || messages.length !== chat_data.length) {
                    setScrollMessages(prev => !prev);
                    // setScrollMessages(false);
                }
                setMessages(chat_data);
                if (chat_data.length > 0 && seeUserMessageAs.id === chat_data[chat_data.length - 1].to_user) {
                    const lastMessage = chat_data[chat_data.length - 1];
                    updateMessage({...lastMessage, read: true})
                    
                }
                setLoading(false);

            }
        }

        load();
    }, [reloadMessages]);

    useEffect(() => {
        const load = async () => {
            const selected_user = users.find((user: UserForChat) => user.id === selectedUserId );
                const chat_res = await fetch(`/api/chats?id=${seeUserMessageAs.id}`);

                if (!chat_res.ok) {
                    console.log('Error while fetching chat');
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
                    .filter((filterUser: UserForChat) => filterUser.id !== seeUserMessageAs.id)
                    .sort((a: UserForChat, b: UserForChat) => {
                        let a_chat = chat_data.find((message: Message) => (message.to_user === a.id && message.from_user === seeUserMessageAs.id) || (message.from_user === a.id && message.to_user === seeUserMessageAs.id));
                        let b_chat = chat_data.find((message: Message) => (message.to_user === b.id && message.from_user === seeUserMessageAs.id) || (message.from_user === b.id && message.to_user === seeUserMessageAs.id));
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
                setLoading(false);
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
        }, openChat ? 3000 : 30000);

        return () => clearInterval(interval);
    }, [openChat]);

    return (
        <div className="chat">
            {openChat ? (
                <div>
                    <div>
                        <div>{selectedUserId
                                ? (
                                    <div>
                                        <div>Messages</div>
                                        {seeUserMessageAs.id !== me_user.id && (
                                            <div className='flex'>
                                                <UserCircle user_name={seeUserMessageAs.name} size={25}></UserCircle>
                                                <div>{seeUserMessageAs.name}</div>
                                            </div>
                                        )}
                                        {seeUserMessageAs.id !== me_user.id ? (<div>and</div>) : (<div>with</div>)}
                                        <UserCircle user_name={users.find((user: UserForChat) => user.id === selectedUserId)?.name ?? ''} size={25}></UserCircle>
                                        <div>{users.find((user: UserForChat) => user.id === selectedUserId)?.name}</div>
                                    </div>
                                )
                                : (
                                    <div>
                                        {seeUserMessageAs.id !== me_user.id ? (
                                            <div className='flex'>
                                                <div>Viewing as</div>
                                                <UserCircle user_name={seeUserMessageAs.name} size={25}></UserCircle>
                                                <div>{seeUserMessageAs.name}</div>
                                                <div onClick={() => {setLoading(true); setSeeUserMessageAs(me_user); setReloadChats(prev => prev + 1); }} className='exit button-w-bl'>{`Exit`}</div>
                                            </div>
                                        ) : (
                                            <div>All Messages</div>
                                        )}
                                    </div>)}</div>
                                { me_user.permissions.send_messages_to_all === true && !selectedUserId && seeUserMessageAs.id === me_user.id && (
                                    <div data-img="message-to-all" onClick={() => {setShowSendMessageToAll(true)}}></div>
                                )}
                        <div onClick={() => setOpenChat(false)} className='x'>x</div>
                    </div>
                    <div>
                        {selectedUserId  
                            ? (
                                // CHAT WITH USER
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
                                                    <div key={message.id} className={message.from_user === seeUserMessageAs.id ? 'right' : 'left'}>
                                                        <div>{message.text}</div>
                                                        <div>{format(new Date(message.timestamp), 'hh:mm aa, MM-dd-yyyy')}</div>
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
                                                        from_user: seeUserMessageAs.id,
                                                        to_user: users.find((user: UserForChat) => user.id === selectedUserId )?.id ?? '',
                                                        timestamp: new Date(),
                                                    });
                                                }
                                            }}/>
                                        <div className="button-d-bl-sm" onClick={() => {
                                            sendMessage({
                                                text: messageText,
                                                from_user: seeUserMessageAs.id,
                                                to_user: users.find((user: UserForChat) => user.id === selectedUserId )?.id ?? '',
                                                timestamp: new Date(),
                                            })
                                        }}
                                        >Send</div>
                                    </div>
                                </div>)
                            : (
                                // ALL CHATS
                                <div>
                                    <div>
                                        <input type="text" name="" id="" value={filter} onChange={(e) => {setFilter(e.target.value)}} placeholder='Input user name to filter here...' className='filter'/>
                                    </div>
                                    {loading === true && (<Loader solid={true} small={true}></Loader>)}
                                    <div className='chats' ref={chatsRef}>
                                        {users
                                            .map((user: UserForChat) => {
                                            if (filter === '' || user.name.toLowerCase().includes(filter.toLowerCase()))
                                            return (
                                                <div key={user.id} className='flex j-s-b'>
                                                    {seeUserMessageAs.id === me_user.id && me_user.permissions.see_other_employees_messages === true && (<div className='see-chats' onClick={() => {setLoading(true); setSeeUserMessageAs(user); setReloadChats(prev => prev + 1); }}></div>)}
                                                    <div className={chats.find((message: Message) => message.to_user === seeUserMessageAs.id && message.from_user === user.id)?.read === true 
                                                                    || !chats.find((message: Message) => message.to_user === seeUserMessageAs.id && message.from_user === user.id) ? "flex chat-user-name" : "unread flex chat-user-name"}
                                                                    onClick={() => {openChatById(user.id)}}
                                                                    >
                                                        <UserCircle user_name={user.name} size={25}></UserCircle>
                                                        <div>{user.name}</div>
                                                    </div>
                                                    <div className='chats-list-hover-message' onClick={() => {openChatById(user.id)}}>
                                                        <div>
                                                            {chats
                                                                .sort((a: Message, b: Message) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                                                                .find((message: Message) => message.to_user === user.id || message.from_user === user.id)?.text}
                                                        </div>
                                                        <div>
                                                            {(() => {
                                                                const lastMessage = chats
                                                                    .toSorted(
                                                                        (a, b) =>
                                                                            new Date(b.timestamp).getTime() -
                                                                            new Date(a.timestamp).getTime()
                                                                    )
                                                                    .find(
                                                                        message =>
                                                                            message.to_user === user.id ||
                                                                            message.from_user === user.id
                                                                    );

                                                                return lastMessage
                                                                    ? format(new Date(lastMessage.timestamp), 'hh:mm a, MM-dd-yyyy')
                                                                    : '';
                                                            })()}
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
                <span onClick={() => setOpenChat(true)} className={chats.filter((message: Message) => message.to_user === seeUserMessageAs.id && message.read === false).length > 0 ? "unread" : ""}></span>
            )}
            {showSendMessageToAll && (
                <div className='confirm send-message-to-all'>
                    {loading === true ? (<div className='messages loader'><Loader></Loader></div>) : (
                        <div>
                            <h1>Type in message to send <strong>to all employees:</strong></h1>
                            <p>They will receive it <strong>in their chats</strong></p>
                            <div>
                                <textarea id="message-to-all" placeholder='Message to all employees...'></textarea>
                            </div>
                            <div>
                                <div className='button-w-bl' onClick={() => {setShowSendMessageToAll(false)}}>Cancel</div>
                                <div className='button-d-bl' onClick={() => 
                                    sendMessageToAll()
                                }>Send</div>
                            </div>
                        </div>)}
                </div>
            )}
        </div>
    )
}

// TODO: MAYBE ADD LATER A POSSIBILTY TO ATTACH IMAGES AND OR FILES (FIND OUT HOW MUCH WILL COST STORE FILES ON VERCEL)

export default Chat;