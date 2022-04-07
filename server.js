require("dotenv").config();
const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const socket = require("socket.io");
const io = socket(server);
const path = require("path");

const rooms = {};
const roomIDA = [];

io.on("connection", (socket) => {
  socket.on("join room", (roomID) => {
    roomIDA.push(roomID);

    if (rooms[roomID]) {
      rooms[roomID].push(socket.id);
    } else {
      rooms[roomID] = [socket.id];
    }
    const otherUser = rooms[roomID].find((id) => id !== socket.id);
    if (otherUser) {
      socket.emit("other user", otherUser);
      socket.to(otherUser).emit("user joined", socket.id);
    }
  });

  socket.on("disconnect", () => {
    console.log("disconnect event called");
    let roomIDO;

    for (var i = 0; i < roomIDA.length; i++) {
      for (var j = 0; j < rooms[roomIDA[i]].length; j++) {
        if (socket.id === rooms[roomIDA[i]][j]) {
          roomIDO = roomIDA[i];
        }
      }
    }

    console.log("rooms", rooms);
    console.log("roomIDO", roomIDO);
    console.log("rooms[roomIDO]", rooms[roomIDO]);

    console.log("arr length  is: ", rooms[roomIDO].length);

    var filtered = rooms[roomIDO].filter(function (value, index, arr) {
      return value !== socket.id;
    });

    rooms[roomIDO] = filtered;

    socket.to(rooms[roomIDO][0]).emit("user left");

    console.log("rooms", rooms);
    console.log("roomIDO", roomIDO);
    console.log("rooms[roomIDO]", rooms[roomIDO]);

    console.log("arr length  is: ", rooms[roomIDO].length);

    // all is remaining to delete roomIDO from roomIDA and rooms after removing both user.
  });

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
