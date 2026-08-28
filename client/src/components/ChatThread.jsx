import { useState, useEffect, useRef } from "react";
import socket from "../socket";

const time = (d) =>
  new Date(d).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

export default function ChatThread({
  me,
  other,
  messages,
  onSend,
  onTyping,
  typingUser,
}) {
  const [text, setText] = useState("");
  const bottom = useRef(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    if (!text.trim()) return;

    onSend(text);
    setText("");

    if (onTyping) {
      onTyping(false);
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setText(value);

    if (onTyping) {
      onTyping(value.length > 0);
    }
  };

  return (
    <div className="main">
      <div className="main-head">
        <div className="avatar grey">
          {other.name.charAt(0).toUpperCase()}
        </div>

        <div>
          <div className="name">{other.name}</div>

          {typingUser === other._id ? (
            <div className="small green">typing...</div>
          ) : (
            <div className="small green">online</div>
          )}
        </div>
      </div>

      <div className="body">
        {messages.length === 0 && (
          <p className="muted center-text">
            No messages yet.
          </p>
        )}

        {messages.map((m) => (
          <div
            key={m._id}
            className={
              "bubble " +
              (m.from === me._id ? "out" : "in")
            }
          >
            {m.text}

            <span className="stamp">
              {time(m.createdAt)}

              {m.from === me._id && (
                <span
                  className={
                    m.read ? "ticks read" : "ticks"
                  }
                >
                  ✓✓
                </span>
              )}
            </span>
          </div>
        ))}

        <div ref={bottom} />
      </div>

      <div className="foot">
        <input
          value={text}
          placeholder="Type a message"
          onChange={handleChange}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              send();
            }
          }}
        />

        <button className="send" onClick={send}>
          ➤
        </button>
      </div>
    </div>
  );
}