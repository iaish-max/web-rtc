require("dotenv").config();
const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const socket = require("socket.io");
const io = socket(server);
const path = require("path");

const rooms = {};

//add
let roomIdO = "";

let user1;
let user2;
let otherUser;

//add

io.on("connection", (socket) => {
  // socket.on("join room", (roomID) => {
  //   if (rooms[roomID]) {
  //     rooms[roomID].push(socket.id);
  //   } else {
  //     rooms[roomID] = [socket.id];
  //   }
  //   const otherUser = rooms[roomID].find((id) => id !== socket.id);
  //   if (otherUser) {
  //     socket.emit("other user", otherUser);
  //     socket.to(otherUser).emit("user joined", socket.id);
  //   }
  // });

  //add
  socket.on("join room", (roomID) => {
    roomIdO = roomID;

    console.log("roomIdO is: ", roomIdO);

    if (rooms[roomID]) {
      rooms[roomID].push(socket.id);
      // console.log("rooms[roomID] is: ", rooms[roomID]);

      user2 = socket.id;
    } else {
      rooms[roomID] = [socket.id];
      // console.log("rooms[roomID] is: ", rooms[roomID]);

      user1 = socket.id;
    }

    // const otherUser = rooms[roomID].find((id) => id !== socket.id);
    // if (otherUser) {
    //   socket.emit("other user", otherUser);
    //   socket.to(otherUser).emit("user joined", socket.id);
    // }

    // console.log("rooms is: ", rooms);

    if (user1 === socket.id) {
      otherUser = user2;
    } else if (user2 === socket.id) {
      otherUser = user1;
    }

    if (otherUser) {
      socket.emit("other user", otherUser);
      socket.to(otherUser).emit("user joined", socket.id);
    }
  });

  socket.on("disconnect", () => {
    console.log("disconnect event called");

    if (user1 === socket.id) {
      user1 = "";
    } else {
      user2 = "";
    }

    socket.to(otherUser).emit("user left");
  });

  //add

  socket.on("offer", (payload) => {
    io.to(payload.target).emit("offer", payload);
  });

  socket.on("answer", (payload) => {
    io.to(payload.target).emit("answer", payload);
  });

  socket.on("ice-candidate", (incoming) => {
    io.to(incoming.target).emit("ice-candidate", incoming.candidate);
  });
});

if (process.env.PROD) {
  app.use(express.static(path.join(__dirname, "./client/build")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "./client/build/index.html"));
  });
}

const port = process.env.PORT || 8000;
server.listen(port, () => console.log(`server is running on port ${port}`));
