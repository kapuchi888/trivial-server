const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');

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

// ===== CARGAR PREGUNTAS DESDE JSON =====
const allQuestions = JSON.parse(fs.readFileSync('./questions.json', 'utf8'));

// Función para mezclar array (Fisher-Yates shuffle)
function shuffleArray(array) {
    const shuffled = [...array]; // Copia del array
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Función para seleccionar preguntas aleatorias SIN REPETIR
function getRandomQuestions(count = 10) {
    const shuffled = shuffleArray(allQuestions);
    const selected = [];
    const usedTexts = new Set(); // Para verificar duplicados por texto
    
    for (let question of shuffled) {
        // Solo añadir si no hemos usado esta pregunta exacta
        if (!usedTexts.has(question.question)) {
            selected.push(question);
            usedTexts.add(question.question);
            
            if (selected.length >= count) {
                break;
            }
        }
    }
    
    return selected;
}

// Socket.IO eventos
io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    socket.on('createRoom', (data) => {
        const playerName = typeof data === 'string' ? data : data.playerName;
        const mode = (typeof data === 'object' && data.mode) ? data.mode : 'normal';
        const questionsPerPlayer = mode === 'quick' ? 5 : 15;
        const totalQuestions = questionsPerPlayer * 2;
        
        const roomCode = generateRoomCode();
        rooms[roomCode] = {
            players: [{
                id: socket.id,
                name: playerName,
                ready: false,
                score: 0,
                questionsAnswered: 0
            }],
            currentQuestion: 0,
            currentPlayerIndex: 0, // Índice del jugador que tiene el turno
            started: false,
            mode: mode,
            questionsPerPlayer: questionsPerPlayer,
            questions: getRandomQuestions(totalQuestions)
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
            score: 0,
            questionsAnswered: 0
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
        if (!player) return;
        
        // Verificar que sea el turno de este jugador
        if (room.players[room.currentPlayerIndex].id !== socket.id) return;
        
        // Marcar que este jugador ya respondió
        player.hasAnswered = true;
        player.questionsAnswered++;
        
        const question = room.questions[room.currentQuestion];
        const isCorrect = answerIndex === question.correct;
        
        if (isCorrect) {
            player.score += timeLeft * 10;
        }
        
        socket.emit('answerResult', {
            isCorrect,
            correctAnswer: question.correct
        });
        
        // Verificar si el juego terminó (ambos jugadores completaron sus preguntas)
        if (room.players.every(p => p.questionsAnswered >= room.questionsPerPlayer)) {
            // Fin del juego - enviar a AMBOS jugadores
            setTimeout(() => {
                const winner = room.players.reduce((max, p) => 
                    p.score > max.score ? p : max
                );
                io.to(roomCode).emit('gameOver', {
                    players: room.players,
                    winner: winner.name
                });
                delete rooms[roomCode];
            }, 2000);
        } else {
            // Continuar con siguiente turno
            // Enviar "esperando" al jugador que acaba de contestar
            setTimeout(() => {
                const otherPlayer = room.players[1 - room.currentPlayerIndex];
                io.to(socket.id).emit('waitingTurn', {
                    currentPlayerName: otherPlayer.name
                });
                nextTurn(roomCode);
            }, 2000);
        }
    });

    socket.on('nextQuestion', (roomCode) => {
        const room = rooms[roomCode];
        if (!room) return;
        
        const currentPlayer = room.players[room.currentPlayerIndex];
        
        // Solo procesar si es del jugador correcto y no ha respondido
        if (currentPlayer.id === socket.id && !currentPlayer.hasAnswered) {
            currentPlayer.questionsAnswered++;
            currentPlayer.hasAnswered = true;
            
            // Verificar si el juego terminó
            if (room.players.every(p => p.questionsAnswered >= room.questionsPerPlayer)) {
                // Fin del juego - enviar a AMBOS jugadores
                const winner = room.players.reduce((max, p) => 
                    p.score > max.score ? p : max
                );
                io.to(roomCode).emit('gameOver', {
                    players: room.players,
                    winner: winner.name
                });
                delete rooms[roomCode];
            } else {
                // Avanzar al siguiente turno
                nextTurn(roomCode);
            }
        }
    });
    
    function nextTurn(roomCode) {
        const room = rooms[roomCode];
        if (!room) return;
        
        // Resetear estado de respuesta del jugador actual
        room.players[room.currentPlayerIndex].hasAnswered = false;
        
        // Cambiar de turno
        room.currentPlayerIndex = 1 - room.currentPlayerIndex;
        room.currentQuestion++;
        
        // Resetear estado del siguiente jugador
        room.players[room.currentPlayerIndex].hasAnswered = false;
        
        // Enviar siguiente pregunta
        sendQuestion(roomCode);
    }

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
    
    socket.on('leaveRoom', (roomCode) => {
        const room = rooms[roomCode];
        if (!room) return;
        
        // Eliminar jugador de la sala
        room.players = room.players.filter(p => p.id !== socket.id);
        
        // Si la sala está vacía, eliminarla
        if (room.players.length === 0) {
            delete rooms[roomCode];
        } else {
            // Notificar al otro jugador
            io.to(roomCode).emit('playerLeft', room.players);
        }
    });
});

function sendQuestion(roomCode) {
    const room = rooms[roomCode];
    const question = room.questions[room.currentQuestion];
    const currentPlayer = room.players[room.currentPlayerIndex];
    const otherPlayer = room.players[1 - room.currentPlayerIndex];
    
    // Enviar pregunta solo al jugador actual
    io.to(currentPlayer.id).emit('newQuestion', {
        question: question.question,
        options: question.options,
        questionNumber: currentPlayer.questionsAnswered + 1,
        totalQuestions: room.questionsPerPlayer
    });
    
    // Enviar "esperando" al otro jugador
    io.to(otherPlayer.id).emit('waitingTurn', {
        currentPlayerName: currentPlayer.name
    });
}

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

server.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
