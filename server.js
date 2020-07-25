const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const request = require("request");
const { prototype } = require("stream");

app.set("views", "./views");
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use("/public", express.static(__dirname + "/public"));
const rooms = {};

app.get("/", (req, res) => {
    res.render("index", { rooms: rooms });
});

app.post("/room", (req, res) => {
    if (rooms[req.body.room] != null) {
        return res.redirect("/");
    }
    apiData = "";
    rooms[req.body.room] = {
        users: {},
        apiData: {},
        userNames:{},
        finishedPlayers: {},
        firstTimeFlag: 1,
    };
    res.redirect(req.body.room);
    io.emit("room-created", req.body.room);
});

app.get("/:room", (req, res) => {
    if (rooms[req.params.room] == null) {
        return res.redirect("/");
    }
    res.render("room", {
        roomName: req.params.room,
        roomData: rooms[req.params.room],
    });
});

server.listen(process.env.PORT || 3000, process.env.IP, function () {
    console.log("Server Started...");
});

io.on("connection", (socket) => {
    socket.on("new-user", (room, name) => {
        if (rooms[room]) {
            socket.join(room);
            rooms[room].users[socket.id] = name;
            rooms[room].userNames[name] = true;
            console.log(Object.keys(rooms[room].users).length);
            request(
                "https://opentdb.com/api.php?amount=10&difficulty=easy&type=multiple&encode=base64",
                function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        apiData = JSON.parse(body);
                        rooms[room].finishedPlayers={}
                        if(Object.keys(rooms[room].users).length==1){
                            io.to(socket.id).emit('firstUserJoined',"Game will start in about 30 seconds");
                        }
                        if(Object.keys(rooms[room].users).length==1 && rooms[room].firstTimeFlag){
                            setTimeout(() => {
                                io.to(room).emit("start",apiData);                                
                                rooms[room].firstTimeFlag=0    
                            }, 30000);
                        }else if(rooms[room].firstTimeFlag==0){
                            io.to(room).emit("start",apiData);
                        }
                        
                    }
                }
            );
        }
    });

    socket.on('setUserName',(name,room)=>{
        if (name in rooms[room].userNames){
            socket.emit('userExists',"'"+name +"' already taken! Try another username")
        }else{
            socket.emit('userAdded')
        }
    })

    socket.on("finished",(data)=>{
        socket.to(data.userRoom).broadcast.emit("updateScores", {user:data.user,points:data.userPoints});
        rooms[data.userRoom].finishedPlayers[data.user]=true;
        console.log(Object.keys(rooms[data.userRoom].users).length,Object.keys(rooms[data.userRoom].finishedPlayers).length);
        if(Object.keys(rooms[data.userRoom].users).length==Object.keys(rooms[data.userRoom].finishedPlayers).length){
            if(rooms[data.userRoom].firstTimeFlag){
                rooms[data.userRoom].firstTimeFlag=0
            }
            request(
                "https://opentdb.com/api.php?amount=10&difficulty=easy&type=multiple&encode=base64",
                function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        apiData = JSON.parse(body);
                        rooms[data.userRoom].finishedPlayers={}
                        io.to(data.userRoom).emit("start",apiData);
                    }
                }
            );
        }else{
            io.to(data.userRoom).emit("waitToFinish",apiData);
        }
    })

    socket.on("allPlayersReady", (room) => {
        socket.to(room).broadcast.emit("startGame", { data: "heloo" });
    });

    socket.on("disconnect", () => {
        getUserRooms(socket).forEach((room) => {
            socket
                .to(room)
                .broadcast.emit(
                    "user-disconnected",
                    rooms[room].users[socket.id]
                );
            if(rooms[room].finishedPlayers[rooms[room].users[socket.id]]==true){
                delete rooms[room].finishedPlayers[rooms[room].users[socket.id]]
            }
            delete rooms[room].userNames[rooms[room].users[socket.id]]
            delete rooms[room].users[socket.id];
            if(Object.keys(rooms[room].users).length!=0 && Object.keys(rooms[room].users).length==Object.keys(rooms[room].finishedPlayers).length){
                if(rooms[room].firstTimeFlag){
                    rooms[room].firstTimeFlag=0
                }
                request(
                    "https://opentdb.com/api.php?amount=10&difficulty=easy&type=multiple&encode=base64",
                    function (error, response, body) {
                        if (!error && response.statusCode == 200) {
                            apiData = JSON.parse(body);
                            rooms[room].finishedPlayers={}
                            io.to(room).emit("start",apiData);
                        }
                    }
                );
            }else if(Object.keys(rooms[room].users).length!=0){
                io.to(room).emit("waitToFinish",apiData);
            }
            console.log(rooms)
            if(Object.keys(rooms[room].users).length==0){
                delete rooms[room]
            }
        });
    
    });
});

function getUserRooms(socket) {
    return Object.entries(rooms).reduce((names, [name, room]) => {
        if (room.users[socket.id] != null) names.push(name);
        return names;
    }, []);
}
