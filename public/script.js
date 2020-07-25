const socket = io();
const roomContainer = document.getElementById("room-container");

var userName;
var quesCount = 0;
var points = 0;

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function setUserName(){
    requestedName=document.getElementById('name').value
    if(requestedName!='')    
        socket.emit("setUserName",requestedName,room)
}

socket.on('userExists',(message)=>{
    document.getElementById('info-div').innerHTML=message
})

socket.on('firstUserJoined',(message)=>{
    document.getElementById('info-div').innerHTML=message
})

socket.on('userAdded',()=>{
    signInUser()
})

function generateBtnStr(ansIdx, correct_answer, incorrect_answers) {
    str = "";
    shuffleArray(incorrect_answers);
    for (let i = 0; i < 4; i++) {
        if (i == ansIdx) {
            str +=
                '<div class="col-12 col-sm-12 col-md-3 col-lg-3 col-xl-3"><div class="col-sm-1 col-1 col-md-1"></div><div class="col-sm-12 col-12 col-md-10"><button onclick="checkAnswer' +
                "(" +
                i +
                ')"  id="option' +
                i +
                '" class="btn btn-lg btn-light"> ' +
                atob(correct_answer) +
                '</button></div><div class="col-sm-1 col-1 col-md-1"></div></div>';
        } else {
            str +=
                '<div class="col-12 col-sm-12 col-md-3 col-lg-3 col-xl-3"><div class="col-sm-1 col-1 col-md-1"></div><div class="col-sm-12 col-12 col-md-10"><button onclick="checkAnswer' +
                "(" +
                i +
                ')"  id="option' +
                i +
                '" class="btn btn-lg btn-light">' +
                atob(incorrect_answers[0]) +
                '</button></div><div class="col-sm-1 col-1 col-md-1"></div></div>';
            incorrect_answers.shift();
        }
    }
    return str;
}

function wait(ms) {
    var start = new Date().getTime();
    var end = start;
    while (end < start + ms) {
        end = new Date().getTime();
    }
}

function checkAnswer(num) {
    if (quesCount == 0) {
        quesCount = 1;
        console.log(data);
        updatePageForUser();
    } else if (quesCount != 0) {
        for (let index = 0; index < 4; index++) {
            if (index == correctAns) {
                document.getElementById(
                    "option" + index
                ).style.backgroundColor = "#15be4d";
                document.getElementById("option" + index).style.color = "white";
                document.getElementById("option" + index).disabled = true;
            } else {
                document.getElementById(
                    "option" + index
                ).style.backgroundColor = "#ff3e3e";
                document.getElementById("option" + index).style.color = "white";
                document.getElementById("option" + index).disabled = true;
            }
        }
        quesCount++;
        if (num == correctAns) {
            points += 10;
            document.getElementById("points-val").innerHTML = points;
        }
        document.getElementById("next-btn").style.display = "block";
    }

    if (quesCount > 10) {
        socket.emit("finished", {
            user: userName,
            userPoints: points,
            userRoom: room,
        });
        correctAns = points / 10;
        document.getElementById("next-btn").style.display = "none";
        document.getElementById("restart-btn").style.display = "block";
        swal(
            "Results",
            "Correct Answers: " +
                correctAns +
                "\nWrong Answers: " +
                (10 - correctAns) +
                "\nTotal Points: " +
                points
        );
        return;
    }
}

function updatePageForUser() {
    question = data["results"][quesCount - 1];
    correctAns = Math.floor(Math.random() * Math.floor(4));
    document.body.innerHTML =
        '<body><div class="row"><div class="col-12 col-sm-12 col-md-10"><div class="row"><span id="points" class="col-sm-12 col-md-3">Points: <span id="points-val">' +
        points +
        '</span></span><span class="col-sm-12 col-md-1"></span><span class="col-sm-12 col-md-8" id="category">' +
        atob(question["category"]).split(":").slice(-1)[0] +
        '</span></div><div id="question">' +
        quesCount +
        ") " +
        atob(question["question"]) +
        ' </div><div id="option-btns" class="row">' +
        generateBtnStr(
            correctAns,
            question["correct_answer"],
            question["incorrect_answers"]
        ) +
        '</div><button onclick="updatePageForUser()" id="next-btn" class="btn btn-lg btn-light">Next</button><div id="restart-btn" class="btn btn-lg btn-light">Waiting For Other Players...</div></div><div class="col-12 col-sm-12 col-md-2" id="scorecard"></div></div>';
    writeOnScorecard();
}

otherPlayerScore = [];
socket.on("updateScores", (data) => {
    otherPlayerScore.push(data);
    writeOnScorecard();
});

function writeOnScorecard() {
    scorecard.innerHTML = "<h3 id='scorecard-title'>Scorecard</h3><hr>";
    otherPlayerScore.forEach((score) => {
        userScore = document.createElement("div");
        userScore.setAttribute("class", "player-score");
        userScore.innerText = score.user + ":" + score.points;
        scorecard.append(userScore);
        scorecard.append(document.createElement("hr"));
    });
}
socket.on("room-created", (room) => {
    const roomElement = document.createElement("div");
    roomElement.innerText = room;
    const roomLink = document.createElement("a");
    roomLink.href = `/${room}`;
    roomLink.innerText = "join";
    roomContainer.append(roomElement);
    roomContainer.append(roomLink);
});

function signInUser() {
    userName = document.getElementById("name").value;
    socket.emit("new-user", room, userName);
}

socket.on("user-connected", (data) => {
    if (Object.keys(data.allUsers).length < 3) {
        document.body.innerHTML(
            '<h1 align="center">Waiting For Other Players</h1>'
        );
    } else {
        socket.emit("allPlayersReady", room);
    }
});

socket.on("start", (serverData) => {
    quesCount = 0;
    data = serverData;
    if (document.getElementById("restart-btn")) {
        document.getElementById("restart-btn").style.display = "block";
        otherPlayerScore = [];
        setTimeout(() => {
            setTimeout(() => {
                setTimeout(() => {
                    document.getElementById("restart-btn").innerHTML =
                        "Restarting in 1 seconds";
                    setTimeout(() => {
                        checkAnswer(1);
                    }, 1000);
                }, 1000);
                document.getElementById("restart-btn").innerHTML =
                    "Restarting in 2 seconds";
            }, 1000);
            document.getElementById("restart-btn").innerHTML =
                "Restarting in 3 seconds";
        }, 1000);
    } else {
        checkAnswer(1);
    }
});

socket.on("wait", (data) => {
    document.body.innerHTML =
        '<h1 align="center">Waiting For Other Players</h1>';
});

socket.on("waitToFinish", () => {
    // document.getElementById('restart-btn').disabled=true
});

socket.on("user-disconnected", (name) => {
    console.log(name + " disconnected");
});
