import { createSlice } from "@reduxjs/toolkit";

const chatSlice = createSlice({
  name: "chat",

  initialState: {
    unread: {},
    messages: [],
  },

  reducers: {
    setUnread: (state, action) => {
      state.unread = action.payload;
    },

    updateUnread: (state, action) => {
      const { userId, count } = action.payload;
      state.unread[userId] = count;
    },

    setMessages: (state, action) => {
      state.messages = action.payload;
    },

    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },

    markMessagesRead: (state, action) => {
      const userId = action.payload;

      state.messages = state.messages.map((message) => {
        if (message.from === userId) {
          return { ...message, read: true };
        }

        return message;
      });
    },
  },
});

export const {
  setUnread,
  updateUnread,
  setMessages,
  addMessage,
  markMessagesRead,
} = chatSlice.actions;

export default chatSlice.reducer;