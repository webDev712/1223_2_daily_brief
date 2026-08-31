"use client";

import { useState } from 'react';
import './css/Chat.css'

const Chat = () => {
    const [openChat, setOpenChat] = useState(true);
    return (
        <div className="chat">
            {openChat ? (
                <div>
                    <div>
                        <div>All Messages</div>
                        <div onClick={() => setOpenChat(false)}>x</div>
                    </div>
                    <div>
                        messages list
                    </div>
                </div>
            ) : (
                <span onClick={() => setOpenChat(true)}></span>
            )}
        </div>
    )
}

export default Chat;

// b6eb1642-4d32-4c5f-88f3-95d3ff281292
// d5fb88ce-a759-4285-8f99-95ffc02eea95
// from_user
// UUID
// to_user
// UUID
// text
// TEXT
// read
// BOOLEAN
// timestamp
// TIMESTAMP WITH TIME ZONE
// Constraints
