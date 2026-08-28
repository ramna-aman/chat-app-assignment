const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");

const Message = require("./models/Message");

const mongoose = require ("mongoose");
const onlineUsers = new Map();

function getOnlineCount() {
  return onlineUsers.size;
}

function addUser(userId) {
  onlineUsers.set(userId, (onlineUsers.get(userId) || 0) + 1);
}

function removeUser(userId) {
  const count = (onlineUsers.get(userId) || 1) - 1;
  if (count <= 0) onlineUsers.delete(userId);
  else onlineUsers.set(userId, count);
}

function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  // ---- DONE FOR YOU: JWT check during the handshake ----
  io.use((socket, next) => {
    try {
      const raw = socket.handshake.headers.cookie || "";
      const token = cookie.parse(raw).token;
      if (!token) return next(new Error("No token"));

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: payload.id };
      next();
    } catch (err) {
      next(new Error("Not authorised"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user.id;

    // Each user joins a room named after their own id.
    // Sending to a room means every tab of that user gets the event.
    socket.join(userId);

    addUser(userId);
    console.log("Connected:", userId, "| online:", getOnlineCount());

    io.emit("online:count",getOnlineCount());
    io.emit("online:users",Array.from(onlineUsers.keys()));
    socket.on("chat:history",async(withUserId,ack)=>{
      try{
        const messages = await Message.find({
          $or:[
            {from:userId,to:withUserId},
            {from:withUserId,to:userId},
          ],
        }).sort({createdAt:1});
        ack(messages);
      }catch(err){ack([]);}
    });
    socket.on("chat:send",async({to,text},ack)=>{
      try{
        if(!text||!text.trim())return;
      const message = await Message.create({
        from:userId,
        to,
        text:text.trim(),
        read:false,
      });
      io.to(userId).emit("chat:message",message);
      io.to(to).emit("chat:message",message);
      const unreadCount = await Message.countDocuments({
        from:userId,
        to,
        read:false,
      });
      io.to(to).emit("chat:unread:update",{
        userId,
        count:unreadCount,
      });
      if(ack)ack({ok:true});

      }catch(err){
        if(ack)ack({ok:false});
      }
    });
    socket.on("chat:unread",async(ack)=>{
      try{
        const counts = await Message.aggregate([{
          $match:{
          to:new mongoose.Types.ObjectId(userId),
            read:false,
          },
        },{
          $group:{
            _id:"$from",
            count:{$sum:1},
          },
        },]);
        ack(counts.map((item)=>({
          userId:item._id.toString(),
          count:item.count,
        })
        ));
      }catch(err){
        ack([]);
      }
    });
    socket.on("chat:read",async(fromUserId)=>{
      try{
        await Message.updateMany({
          from:fromUserId,
          to:userId,
          read:false,
        },
      {$set:{read:true},});
      io.to(userId).emit("chat:unread:update",{
        userId:fromUserId,
        count:0,
      });
      io.to(fromUserId).emit("chat:messages:read",{
        byUserId:userId,
      });
      }catch(err){}
    });
    
socket.on("chat:typing", ({ to, isTyping }) => {
  io.to(to).emit("chat:typing", {
    userId,
    isTyping,
  });
});
    socket.on("disconnect", () => {
      removeUser(userId);
      console.log("Disconnected:", userId, "| online:", getOnlineCount());
      io.emit("online:count",getOnlineCount());
      io.emit("online:users",Array.from(onlineUsers.keys()));
    });
  });

  return io;
}

module.exports = initSocket;
