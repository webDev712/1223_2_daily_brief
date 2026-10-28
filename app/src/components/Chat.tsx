"use client";

import { useEffect, useRef, useState, useMemo, useLayoutEffect } from 'react';
import './css/Chat.css'
import { useTranslations } from 'next-intl';
import { useUser } from './UserProvider';
import { Message, NewMessage, UserForChat, User } from '@/lib/types';
import { format } from 'date-fns';
import UserCircle from './UserCircle';
import Loader from './Loader';
import { toast } from 'sonner';
import { Dispatch, SetStateAction } from "react";
import ImageUploader from './ImageUploader';
import isBlobLink from '@/lib/img';
import FileUploader from './FileUploader';


function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|avif)(\?.*)?$/i.test(url);
}

interface ChatFileAttachment {
    url: string;
    file_name: string
}

function parseFileAttachment(
  text: string
): ChatFileAttachment | null {
  try {
    const parsed = JSON.parse(text);

    if (
      typeof parsed?.url === "string" &&
      typeof parsed?.file_name === "string"
    ) {
      return {
        url: parsed.url,
        file_name: parsed.file_name,
      };
    }
  } catch { }

  return null;
}

// Not a component, so it can't use hooks: the caller passes the already translated toast text.
export const sendMessageGlobal = async (message: NewMessage, successMessage?: string) => {
    const chat_res = await fetch('/api/chat', {
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify(message)}
    )
    if (!chat_res.ok){
        console.error('Error while sending message');
        return;
    }
    toast.success(successMessage ?? 'Issue / Observation owner is notified with new action!')
}

const Chat = ({openChat, setOpenChat, class_name}: {
        openChat: boolean;
        setOpenChat: Dispatch<SetStateAction<boolean>>;
        class_name?: string;
    }) => {

    const t = useTranslations('chat');
    const strong = (chunks: React.ReactNode) => <strong>{chunks}</strong>;
        
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('');

    const me_user = useUser();

    const [chats, setChats] = useState<Message[]>([]);
    const [users, setUsers] = useState<UserForChat[]>([]);
    const [usersForSendMessageToGroup, setUsersForSendMessageToGroup] = useState<UserForChat[]>([]);
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
    const [loadingFalseNextChatReload, setLoadingFalseNextChatReload] = useState(false);


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
        setReloadChats(prev => prev + 1);
        setReloadMessages(prev => prev + 1);
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

    const sendMessageToGroup = async () => {
        const textareaElement = (document.getElementById('message-to-all')) as HTMLTextAreaElement;
        if (!textareaElement) return;
        const chats_res = await fetch('/api/chats', {
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({
                id: seeUserMessageAs.id, 
                text: `NOTIFICATION: ${textareaElement.value || '-'}`, 
                timestamp: new Date(), 
                users_ids: usersForSendMessageToGroup.map((user: UserForChat) => {if (user.sendMessageToGroupSelected) return user.id})
            })
        })
        if (!chats_res.ok){
            console.error('Error while sending message');
            toast.error(t('toast.groupError'))
            return;
        }
        setReloadChats(prev => prev + 1);
        setReloadMessages(prev => prev + 1);
        const chats_json = await chats_res.json();
        toast.success(t('toast.groupSuccess', { count: chats_json.rows.length }))
        setShowSendMessageToAll(false);

    }

    const initialScrollRef = useRef(true);
    const previousMessageIdsRef = useRef<Set<string>>(new Set());

    const openChatById = (id: string) => {
        initialScrollRef.current = true;
        shouldAutoScrollRef.current = true;
        previousMessageIdsRef.current = new Set();


        setSelectedUserId(id);
        setLoading(true);

        const unreadMessages = chats.filter(
            message =>
                message.from_user === id &&
                message.to_user === seeUserMessageAs.id &&
                message.read === false
        );

        if (unreadMessages.length > 0) {
            const unreadIds = new Set(
                unreadMessages.map(message => message.id)
            );

            setChats(prev =>
                prev.map(message =>
                    unreadIds.has(message.id)
                        ? { ...message, read: true }
                        : message
                )
            );

            setMessages(prev =>
                prev.map(message =>
                    unreadIds.has(message.id)
                        ? { ...message, read: true }
                        : message
                )
            );

            void Promise.all(
                unreadMessages.map(message =>
                    updateMessage({ ...message, read: true })
                )
            );
        }

        setScrollMessages(true);
    };
    useLayoutEffect(() => {
        const container = messagesRef.current;

        if (!container || loading) return;

        const currentIds = new Set(
            messages.map(message => String(message.id))
        );

        const hasNewMessage = messages.some(
            message => !previousMessageIdsRef.current.has(String(message.id))
        );

        // При первом открытии чата прокручиваем вниз
        if (initialScrollRef.current) {
            container.scrollTop = container.scrollHeight;
            initialScrollRef.current = false;
            shouldAutoScrollRef.current = true;
        } else if (hasNewMessage && !shouldAutoScrollRef.current) {
            // Новое сообщение: скроллим, только если пользователь был внизу
            container.scrollTop = container.scrollHeight;
        }

        previousMessageIdsRef.current = currentIds;
    }, [messages, loading]);

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

            let users_data = await users_res.json();
            users_data = users_data
                .filter((filterUser: UserForChat) => filterUser.id !== seeUserMessageAs.id && filterUser.archived !== true)
                .sort((a: UserForChat, b: UserForChat) => {
                    let a_chat = chat_data.find((message: Message) => (message.to_user === a.id && message.from_user === seeUserMessageAs.id) || (message.from_user === a.id && message.to_user === seeUserMessageAs.id));
                    let b_chat = chat_data.find((message: Message) => (message.to_user === b.id && message.from_user === seeUserMessageAs.id) || (message.from_user === b.id && message.to_user === seeUserMessageAs.id));
                    return (b_chat?.timestamp? new Date(b_chat.timestamp).getTime() : 0) - (a_chat?.timestamp? new Date(a_chat.timestamp).getTime() : 0) !== 0 ? 
                                (b_chat?.timestamp? new Date(b_chat.timestamp).getTime() : 0) - (a_chat?.timestamp? new Date(a_chat.timestamp).getTime() : 0) 
                                : a.name.localeCompare(b.name);
                })
            setUsers(users_data);
            let users_change = users_data.map((user: User) => { return {...user, sendMessageToGroupSelected: true } })
            setUsersForSendMessageToGroup(users_change)
            setChats(chat_data);
        }

        load();
    }, [])

    useEffect(() => {
        if (!selectedUserId) {
            // setLoading(false);
            return;
        }

        let cancelled = false;

        const load = async () => {
            try {
                const res = await fetch(
                    `/api/chat?id_1=${encodeURIComponent(seeUserMessageAs.id)}` +
                    `&id_2=${encodeURIComponent(selectedUserId)}`
                );

                if (!res.ok) {
                    console.error('Failed to fetch messages');
                    return;
                }

                const data: Message[] = await res.json();

                if (cancelled) return;

                setMessages(data);
                setScrollMessages(true);
            } catch (error) {
                if (!cancelled) {
                    console.error('Error loading messages:', error);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [selectedUserId, seeUserMessageAs.id, reloadMessages]);

    useEffect(() => {
        const load = async () => {
            console.log(0)
            const selected_user = users.find((user: UserForChat) => user.id === selectedUserId );
                const chat_res = await fetch(`/api/chats?id=${seeUserMessageAs.id}`);
            console.log(1)

                if (!chat_res.ok) {
                    console.log('Error while fetching chat');
                    return;
                }
            console.log(2)

                const chat_data = await chat_res.json();
                const users_res = await fetch('/api/users');

                if (!users_res.ok) {
                    console.error('Error while fetching users');
                    return;
                }
                let users_data = await users_res.json();
                users_data = users_data
                    .filter((filterUser: UserForChat) => filterUser.id !== seeUserMessageAs.id && filterUser.archived !== true)
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
            console.log(3)
                setUsers(users_data);
                setChats(chat_data);
                console.log(`/api/chats?id=${seeUserMessageAs.id}`)
                if (loadingFalseNextChatReload === true) {
                    setLoading(false);
                    setLoadingFalseNextChatReload(false);
                }
            console.log(4)
                // setLoading(false);
            }
        load();
    }, [reloadChats, seeUserMessageAs.id])
    const shouldAutoScrollRef = useRef(true);
    const lastMessageIdRef = useRef<string | null>(null);
    useEffect(() => {
    const container = messagesRef.current;
    if (!container || loading) return;

    const lastMessage = messages[messages.length - 1];
    const lastMessageId = lastMessage?.id ?? null;

    if (initialScrollRef.current) {
        container.scrollTop = container.scrollHeight;
        initialScrollRef.current = false;
        lastMessageIdRef.current = lastMessageId;
        shouldAutoScrollRef.current = true;
        return;
    }

    const hasNewMessage =
        lastMessageId !== null &&
        lastMessageId !== lastMessageIdRef.current;

    lastMessageIdRef.current = lastMessageId;

    if (hasNewMessage && shouldAutoScrollRef.current) {
        requestAnimationFrame(() => {
            const currentContainer = messagesRef.current;
            if (!currentContainer || !shouldAutoScrollRef.current) return;

            currentContainer.scrollTop = currentContainer.scrollHeight;
        });
    }
}, [messages, loading]);

    useEffect(() => {
        requestAnimationFrame(() => {
            if (chatsRef.current) {
                chatsRef.current.scrollTop = 0;
            }
        });
    }, [scrollChats]);


    useEffect(() => {
        const interval = setInterval(() => {
            if (document.visibilityState !== 'visible') return;

            if (selectedUserId !== null) {
                setReloadMessages(prev => prev + 1);
            } else if (openChat) {
                setReloadChats(prev => prev + 1);
            }
        }, 10000);

        return () => clearInterval(interval);
    }, [openChat, selectedUserId]);

    const latestMessageByUser = useMemo(() => {
        const map = new Map<string, Message>();

        const sorted = [...chats].sort(
            (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime()
        );

        for (const message of sorted) {
            const otherUserId =
                message.from_user === seeUserMessageAs.id
                    ? message.to_user
                    : message.from_user;

            if (!map.has(otherUserId)) {
                map.set(otherUserId, message);
            }
        }

        return map;
    }, [chats, seeUserMessageAs.id]);
    return (
        <div className={class_name ? class_name : "chat"}>
            <span onClick={() => setOpenChat(prev => !prev)} className={chats.filter((message: Message) => message.to_user === seeUserMessageAs.id && message.read === false).length > 0 ? "unread" : ""}></span>
            {openChat && (
                <div>
                    <div>
                        <div>{selectedUserId
                                ? (
                                    <div>
                                        <div>{t('header.messages')}</div>
                                        {seeUserMessageAs.id !== me_user.id && (
                                            <div className='flex'>
                                                <UserCircle user_name={seeUserMessageAs.name} size={25}></UserCircle>
                                                <div>{seeUserMessageAs.name}</div>
                                            </div>
                                        )}
                                        {seeUserMessageAs.id !== me_user.id ? (<div>{t('header.and')}</div>) : (<div>{t('header.with')}</div>)}
                                        <UserCircle user_name={users.find((user: UserForChat) => user.id === selectedUserId)?.name ?? ''} size={25}></UserCircle>
                                        <div>{users.find((user: UserForChat) => user.id === selectedUserId)?.name}</div>
                                    </div>
                                )
                                : (
                                    <div>
                                        {seeUserMessageAs.id !== me_user.id ? (
                                            <div className='flex'>
                                                <div>{t('header.viewingAs')}</div>
                                                <UserCircle user_name={seeUserMessageAs.name} size={25}></UserCircle>
                                                <div>{seeUserMessageAs.name}</div>
                                                <div onClick={() => {setLoading(true); setSeeUserMessageAs(me_user); setLoadingFalseNextChatReload(true); setReloadChats(prev => prev + 1); }} className='exit button-w-bl'>{t('header.exit')}</div>
                                            </div>
                                        ) : (
                                            <div>{t('header.allMessages')}</div>
                                        )}
                                    </div>)}</div>
                                { me_user.permissions.send_messages_to_all === true && !selectedUserId && seeUserMessageAs.id === me_user.id && (
                                    <div data-img="message-to-all" onClick={() => {
                                        setUsersForSendMessageToGroup(
                                            usersForSendMessageToGroup.map((user: UserForChat) => { return {
                                                ...user,
                                                sendMessageToGroupSelected: true
                                            } })
                                        ); setShowSendMessageToAll(true)}}></div>
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
                                        {t('header.back')}
                                    </div>
                                    {loading === true ? (<div className='messages loader'><Loader></Loader></div>) : (
                                        <div className='messages' ref={messagesRef} onScroll={() => {
                                            const container = messagesRef.current;
                                            if (!container) return;

                                            shouldAutoScrollRef.current =
                                                container.scrollHeight -
                                                container.scrollTop -
                                                container.clientHeight < 100;
                                        }}>
                                            
                                            {messages.length > 0 
                                                ? messages.map((message: Message) => (
                                                    <div key={message.id} className={message.from_user === seeUserMessageAs.id ? 'right' : 'left'}>
                                                        {isBlobLink(message.text) || parseFileAttachment(message.text) !== null ?
                                                                (
                                                                    parseFileAttachment(message.text) === null ?
                                                                        (<img src={`/api/blob_image?pathname=${message.text.slice(57)}`} alt={t('messages.image')} onLoad={() => {
                                                                            requestAnimationFrame(() => {
                                                                            const container = messagesRef.current;

                                                                            if (!container || !shouldAutoScrollRef.current) return;

                                                                            container.scrollTop = container.scrollHeight;
                                                                        });
                                                                        }} />)
                                                                        : (<div>
                                                                            <a href={`/api/download?url=${encodeURIComponent(parseFileAttachment(message.text)?.url ?? "")}&name=${encodeURIComponent(parseFileAttachment(message.text)?.file_name ?? "")}`} className='download-file-link'>
                                                                                {parseFileAttachment(message.text)?.file_name ?? t('messages.file')}
                                                                                <br />
                                                                                {t('messages.download')}
                                                                            </a>
                                                                        </div>)
                                                                ) : 
                                                                (<div>{message.text}</div>)}
                                                        <div>{format(new Date(message.timestamp), 'hh:mm aa, MM-dd-yyyy')}</div>
                                                    </div>
                                                ))
                                                : (<p>{t('messages.empty')}</p>)
                                            }
                                        </div>
                                    )}
                                    {seeUserMessageAs.id === me_user.id && (
                                        <div className='flex j-s-b'>
                                            <input type="text" value={messageText} placeholder={t('messages.inputPlaceholder')} onChange={(e) => setMessageText(e.target.value)}
                                            onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        sendMessage({
                                                            text: messageText,
                                                            from_user: seeUserMessageAs.id,
                                                            to_user: users.find((user: UserForChat) => user.id === selectedUserId )?.id ?? '',
                                                            timestamp: new Date(),
                                                        });
                                                    }
                                                }}/>
                                            <ImageUploader send_url_to={(url: string) => {
                                                if (url) {
                                                    sendMessage({
                                                        text: url,
                                                        from_user: seeUserMessageAs.id,
                                                        to_user: users.find((user: UserForChat) => user.id === selectedUserId )?.id ?? '',
                                                        timestamp: new Date(),
                                                    })
                                                }
                                            }}></ImageUploader>
                                            <FileUploader send_url_to={(url: string, file_name: string) => {
                                                if (url) {
                                                    sendMessage({
                                                        text: JSON.stringify({url: url, file_name: file_name}),
                                                        from_user: seeUserMessageAs.id,
                                                        to_user: users.find((user: UserForChat) => user.id === selectedUserId )?.id ?? '',
                                                        timestamp: new Date(),
                                                    })
                                                }
                                            }}></FileUploader>

                                            <div className="button-d-bl-sm" onClick={() => {
                                                sendMessage({
                                                    text: messageText,
                                                    from_user: seeUserMessageAs.id,
                                                    to_user: users.find((user: UserForChat) => user.id === selectedUserId )?.id ?? '',
                                                    timestamp: new Date(),
                                                })
                                            }}
                                            >{t('messages.send')}</div>
                                        </div>
                                    )}
                                </div>)
                            : (
                                // ALL CHATS
                                <div>
                                    <div>
                                        <input type="text" name="" id="" value={filter} onChange={(e) => {setFilter(e.target.value)}} placeholder={t('list.filterPlaceholder')} className='filter'/>
                                    </div>
                                    {loading === true && (
                                        <div style={{width: '100vw', height: '100vh', position: 'fixed', left: 0, top: 0, zIndex: '10000000000000'}}>
                                            <Loader solid={false} small={false}></Loader>
                                        </div>)}
                                    {loading === true && (
                                            <Loader solid={true} small={false}></Loader>)}
                                    <div className='chats' ref={chatsRef}>
                                        {users
                                            .map((user: UserForChat) => {
                                            if (filter === '' || user.name.toLowerCase().includes(filter.toLowerCase())){
                                                const lastMessage = latestMessageByUser.get(user.id);
                                            return (
                                                <div key={user.id} className='flex j-s-b'>
                                                    {seeUserMessageAs.id === me_user.id && me_user.permissions.see_other_employees_messages === true 
                                                        && (<div className='see-chats' onClick={() => {setLoading(true); setSeeUserMessageAs(user); setLoadingFalseNextChatReload(true); 
                                                        // setReloadChats(prev => prev + 1);
                                                         }}></div>)}
                                                    <div className={chats.find((message: Message) => message.to_user === seeUserMessageAs.id && message.from_user === user.id)?.read === true 
                                                                    || !chats.find((message: Message) => message.to_user === seeUserMessageAs.id && message.from_user === user.id) ? "flex chat-user-name" : "unread flex chat-user-name"}
                                                                    onClick={() => {openChatById(user.id)}}
                                                                    >
                                                        <UserCircle user_name={user.name} size={25}></UserCircle>
                                                        <div>{user.name}</div>
                                                    </div>
                                                    <div className='chats-list-hover-message' onClick={() => {openChatById(user.id)}}>
                                                        <div>{isBlobLink(lastMessage?.text ?? '') || parseFileAttachment(lastMessage?.text ?? '') !== null ? (
                                                            parseFileAttachment(lastMessage?.text ?? '') !== null ? parseFileAttachment(lastMessage?.text ?? '')?.file_name : t('messages.image')) : (lastMessage?.text ?? '')}</div>
                                                        <div>
                                                            {lastMessage
                                                                ? format(
                                                                    new Date(lastMessage.timestamp),
                                                                    'hh:mm a, MM-dd-yyyy'
                                                                )
                                                                : ''}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        })}

                                    </div>
                                </div>
                            )}
                    </div>
                </div>
            )}
            {showSendMessageToAll && (
                <div className='confirm send-message-to-all'>
                    {loading === true ? (<div className='messages loader'><Loader></Loader></div>) : (
                        <div>
                            <h1>{t.rich('group.title', { strong })}</h1>
                            <p>{t.rich('group.subtitle', { strong })}</p>
                            <label>
                                <div>{t('group.selectEmployees')}</div>
                                <input type="checkbox" />
                            </label>
                            <div>
                                {usersForSendMessageToGroup.map((user: UserForChat) => (
                                    <label key={`sendMessageToGroupSelected_${user.id}`} >
                                        <input type="checkbox" checked={user.sendMessageToGroupSelected ?? true} onChange={(e) => {
                                            setUsersForSendMessageToGroup((prev) => prev.map((user_local: UserForChat) => {
                                                return user_local.id === user.id ? {
                                                    ...user, 
                                                    sendMessageToGroupSelected: e.target.checked
                                                } : user_local
                                            }))
                                        }}/>
                                        <div>{user.name}</div>
                                    </label>
                                ))}
                                <span onClick={() => {
                                    setUsersForSendMessageToGroup(
                                        usersForSendMessageToGroup.map((user: UserForChat) => { return {
                                            ...user,
                                            sendMessageToGroupSelected: false
                                        } })
                                    )
                                }}
                                className='b-t'>{t('group.clear')}</span>
                            </div>
                            <div>
                                <textarea id="message-to-all" placeholder={t('group.placeholder')}></textarea>
                            </div>
                            <div>
                                <div className='button-w-bl' onClick={() => {setShowSendMessageToAll(false)}}>{t('group.cancel')}</div>
                                <div className='button-d-bl' onClick={() => 
                                    sendMessageToGroup()
                                }>{t('group.send')}</div>
                            </div>
                        </div>)}
                </div>
            )}
        </div>
    )
}

// TODO: MAYBE ADD LATER A POSSIBILTY TO ATTACH IMAGES AND OR FILES (FIND OUT HOW MUCH WILL COST STORE FILES ON VERCEL)

export default Chat;