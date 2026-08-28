import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import api from "../api";
import socket from "../socket";
import UserList from "../components/UserList.jsx";
import ChatThread from "../components/ChatThread.jsx";

import {
  setUnread,
  updateUnread,
  setMessages,
  addMessage,
  markMessagesRead,
} from "../redux/chatSlice.js";

export default function Chat({ user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [unread, setUnreadState] = useState({});
  const [messages, setMessagesState] = useState([]);
  const [latestMessages, setLatestMessages] = useState({});
  const [typingUser, setTypingUser] = useState(null);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  
  useEffect(() => {
    api
      .get("/chat/users")
      .then((res) => {
        setUsers(res.data);

        res.data.forEach((other) => {
          socket.emit("chat:history", other._id, (history) => {
            if (history.length > 0) {
              setLatestMessages((prev) => ({
                ...prev,
                [other._id]: history[history.length - 1],
              }));
            }
          });
        });
      })
      .catch(() => {});
  }, []);

  
  useEffect(() => {
    if (!socket.connected) socket.connect();
  }, []);

  
  useEffect(() => {
    const handleOnlineCount = (count) => {
      setOnlineCount(count);
    };

    const handleOnlineUsers = (users) => {
      setOnlineUsers(users);
    };

    const handleMessage = (message) => {
      const chatUserId =
        message.from === user._id ? message.to : message.from;

      setLatestMessages((prev) => ({
        ...prev,
        [chatUserId]: message,
      }));

      const isCurrentChat =
        activeUser &&
        ((message.from === user._id &&
          message.to === activeUser._id) ||
          (message.from === activeUser._id &&
            message.to === user._id));

      if (isCurrentChat) {
        setMessagesState((prev) => [...prev, message]);
        dispatch(addMessage(message));

        if (message.from === activeUser._id) {
          socket.emit("chat:read", activeUser._id);

          setUnreadState((prev) => ({
            ...prev,
            [activeUser._id]: 0,
          }));
        }
      }
    };

    const handleUnreadUpdate = ({ userId, count }) => {
      setUnreadState((prev) => ({
        ...prev,
        [userId]: count,
      }));

      dispatch(updateUnread({ userId, count }));
    };

    const handleMessagesRead = ({ byUserId }) => {
      setMessagesState((prev) =>
        prev.map((message) =>
          message.from === user._id &&
          message.to === byUserId
            ? { ...message, read: true }
            : message
        )
      );
    };

    const handleTyping = ({ userId, isTyping }) => {
      if (isTyping) {
        setTypingUser(userId);
      } else {
        setTypingUser(null);
      }
    };

    socket.on("online:count", handleOnlineCount);
    socket.on("online:users", handleOnlineUsers);
    socket.on("chat:message", handleMessage);
    socket.on("chat:unread:update", handleUnreadUpdate);
    socket.on("chat:messages:read", handleMessagesRead);
    socket.on("chat:typing", handleTyping);

    socket.emit("chat:unread", (counts) => {
      const result = {};

      counts.forEach(({ userId, count }) => {
        result[userId] = count;
      });

      setUnreadState(result);
      dispatch(setUnread(result));
    });

    return () => {
      socket.off("online:count", handleOnlineCount);
      socket.off("online:users", handleOnlineUsers);
      socket.off("chat:message", handleMessage);
      socket.off("chat:unread:update", handleUnreadUpdate);
      socket.off("chat:messages:read", handleMessagesRead);
      socket.off("chat:typing", handleTyping);
    };
  }, [activeUser, user._id, dispatch]);

  
  const openChat = (other) => {
    setActiveUser(other);
    setMessagesState([]);

    socket.emit("chat:history", other._id, (history) => {
      setMessagesState(history);
      dispatch(setMessages(history));

      if (history.length > 0) {
        setLatestMessages((prev) => ({
          ...prev,
          [other._id]: history[history.length - 1],
        }));
      }
    });

    socket.emit("chat:read", other._id);

    setUnreadState((prev) => ({
      ...prev,
      [other._id]: 0,
    }));

    dispatch(
      updateUnread({
        userId: other._id,
        count: 0,
      })
    );

    dispatch(markMessagesRead(other._id));
  };


  const sendMessage = (text) => {
    if (!text.trim() || !activeUser) return;

    socket.emit("chat:send", {
      to: activeUser._id,
      text: text.trim(),
    });
  };

  
  const handleTyping = (isTyping) => {
    if (!activeUser) return;

    socket.emit("chat:typing", {
      to: activeUser._id,
      isTyping,
    });
  };

  
  const logout = async () => {
    await api.post("/auth/logout");
    socket.disconnect();
    onLogout();
    navigate("/login");
  };

  return (
    <div className="app">
      <UserList
        me={user}
        users={users}
        activeUser={activeUser}
        unread={unread}
        latestMessages={latestMessages}
        onlineCount={onlineCount}
        onlineUsers={onlineUsers}
        onSelect={openChat}
        onLogout={logout}
      />

      {activeUser ? (
        <ChatThread
          me={user}
          other={activeUser}
          messages={messages}
          onSend={sendMessage}
          onTyping={handleTyping}
          typingUser={typingUser}
        />
      ) : (
        <div className="main">
          <div className="empty">
            <div className="empty-icon">💬</div>
            <h3>WhatsApp Style Chat</h3>
            <p>Select a user from the left to start chatting.</p>
            <span className="online-pill">
              Online users: {onlineCount}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}