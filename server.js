const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static('public'));

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Variables del servidor
const rooms = {};
const questions = [
    {
        question: "¿Cuál es la capital de Francia?",
        options: ["Londres", "Berlín", "París", "Madrid"],
        correct: 2
    },
    {
        question: "¿Cuál es el planeta más grande del sistema solar?",
        options: ["Tierra", "Marte", "Júpiter", "Saturno"],
        correct: 2
    },
    {
        question: "¿En qué año llegó el hombre a la Luna?",
        options: ["1965", "1969", "1972", "1975"],
        correct: 1
    },
    {
        question: "¿Cuál es el océano más grande?",
        options: ["Atlántico", "Índico", "Ártico", "Pacífico"],
        correct: 3
    },
    {
        question: "¿Quién pintó la Mona Lisa?",
        options: ["Van Gogh", "Da Vinci", "Picasso", "Miguel Ángel"],
        correct: 1
    },
    {
        question: "¿Cuántos continentes hay?",
        options: ["5", "6", "7", "8"],
        correct: 2
    },
    {
        question: "¿Cuál es el animal terrestre más rápido?",
        options: ["León", "Guepardo", "Tigre", "Caballo"],
        correct: 1
    },
    {
        question: "¿En qué país se encuentra la Torre Eiffel?",
        options: ["Italia", "España", "Francia", "Alemania"],
        correct: 2
    },
    {
        question: "¿Cuál es el metal más abundante en la Tierra?",
        options: ["Oro", "Plata", "Hierro", "Aluminio"],
        correct: 3
    },
    {
        question: "¿Cuántos jugadores hay en un equipo de fútbol?",
        options: ["9", "10", "11", "12"],
        correct: 2
    }
];

// Socket.IO eventos
io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    socket.on('createRoom', (playerName) => {
        const roomCode = generateRoomCode();
        rooms[roomCode] = {
            players: [{
                id: socket.id,
                name: playerName,
                ready: false,
                score: 0
            }],
            currentQuestion: 0,
            started: false
        };
        socket.join(roomCode);
        socket.emit('roomCreated', { roomCode, playerName });
    });

    socket.on('joinRoom', ({roomCode, playerName}) => {
        const room = rooms[roomCode];
        if (!room) {
            socket.emit('roomError', 'Sala no encontrada');
            return;
        }
        if (room.players.length >= 2) {
            socket.emit('roomError', 'Sala llena');
            return;
        }
        room.players.push({
            id: socket.id,
            name: playerName,
            ready: false,
            score: 0
        });
        socket.join(roomCode);
        io.to(roomCode).emit('playerJoined', {
            roomCode,
            players: room.players
        });
    });

    socket.on('playerReady', (roomCode) => {
        const room = rooms[roomCode];
        if (!room) return;
        
        const player = room.players.find(p => p.id === socket.id);
        if (player) player.ready = true;
        
        io.to(roomCode).emit('playersUpdate', room.players);
        
        if (room.players.length === 2 && room.players.every(p => p.ready)) {
            room.started = true;
            sendQuestion(roomCode);
        }
    });

    socket.on('submitAnswer', ({roomCode, answerIndex, timeLeft}) => {
        const room = rooms[roomCode];
        if (!room) return;
        
        const player = room.players.find(p => p.id === socket.id);
        const question = questions[room.currentQuestion];
        const isCorrect = answerIndex === question.correct;
        
        if (isCorrect && player) {
            player.score += timeLeft * 10;
        }
        
        socket.emit('answerResult', {
            isCorrect,
            correctAnswer: question.correct
        });
    });

    socket.on('nextQuestion', (roomCode) => {
        const room = rooms[roomCode];
        if (!room) return;
        
        room.currentQuestion++;
        
        if (room.currentQuestion >= questions.length) {
            const winner = room.players.reduce((max, p) => 
                p.score > max.score ? p : max
            );
            io.to(roomCode).emit('gameOver', {
                players: room.players,
                winner: winner.name
            });
            delete rooms[roomCode];
        } else {
            setTimeout(() => sendQuestion(roomCode), 1000);
        }
    });

    socket.on('disconnect', () => {
        for (let roomCode in rooms) {
            const room = rooms[roomCode];
            room.players = room.players.filter(p => p.id !== socket.id);
            if (room.players.length === 0) {
                delete rooms[roomCode];
            } else {
                io.to(roomCode).emit('playerLeft', room.players);
            }
        }
    });
});

function sendQuestion(roomCode) {
    const room = rooms[roomCode];
    const question = questions[room.currentQuestion];
    io.to(roomCode).emit('newQuestion', {
        question: question.question,
        options: question.options,
        questionNumber: room.currentQuestion + 1,
        totalQuestions: questions.length
    });
}

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

server.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
