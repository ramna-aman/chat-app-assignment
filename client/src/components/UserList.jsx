import { useState } from "react";

const messageTime = (date) => {
  if (!date) return "";

  const d = new Date(date);
  const today = new Date();

  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return "Yesterday";
};

const initial = (name) => (name || "?").charAt(0).toUpperCase();

export default function UserList({
  me,
  users,
  activeUser,
  unread,
  latestMessages,
  onlineCount,
  onlineUsers,
  onSelect,
  onLogout,
}) {
  const [search, setSearch] = useState("");

  const shown = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="side">
      <div className="side-head">
        <div className="me">
          <div className="avatar">{initial(me.name)}</div>

          <div>
            <div className="name">{me.name}</div>
            <div className="muted small">Logged in</div>
          </div>
        </div>

        <div className="right">
          <span className="online-pill">
            ● Online: {onlineCount}
          </span>

          <button className="link-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="search">
        <input
          placeholder="Search users"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="list">
        {shown.map((u) => {
          const latest = latestMessages?.[u._id];
          const unreadCount = unread?.[u._id] || 0;
          const isOnline = onlineUsers?.includes(u._id);

          return (
            <div
              key={u._id}
              className={
                "row " +
                (activeUser?._id === u._id ? "active" : "")
              }
              onClick={() => onSelect(u)}
            >
              <div className="avatar-wrap">
                <div className="avatar grey">
                  {initial(u.name)}
                </div>

                {isOnline && <span className="online-dot"></span>}
              </div>

              <div className="info">
                <div className="row-top">
                  <div className="name">{u.name}</div>

                  {latest && (
                    <div className="chat-time">
                      {messageTime(latest.createdAt)}
                    </div>
                  )}
                </div>

                <div className="row-bottom">
                  <div className="recent-message">
                    {latest?.text || ""}
                  </div>

                  {unreadCount > 0 && (
                    <span className="badge">
                      {unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {shown.length === 0 && (
          <p className="muted pad">No users found.</p>
        )}
      </div>
    </div>
  );
}