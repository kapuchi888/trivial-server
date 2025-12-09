const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static('public'));

// Almacenar salas de juego
const rooms = {};

// Banco de preguntas variadas
const questions = [
    {
        question: "¿Cuál es la capital de Francia?",
        options: ["Londres", "París", "Berlín", "Madrid"],
        correct: 1
    },
    {
        question: "¿Quién pintó la Mona Lisa?",
        options: ["Van Gogh", "Picasso", "Leonardo da Vinci", "Monet"],
        correct: 2
    },
    {
        question: "¿Cuál es el planeta más grande del sistema solar?",
        options: ["Marte", "Saturno", "Júpiter", "Neptuno"],
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
        question: "¿Quién escribió Don Quijote de la Mancha?",
        options: ["Lope de Vega", "Miguel de Cervantes", "Garcilaso de la Vega", "Calderón de la Barca"],
        correct: 1
    },
    {
        question: "¿Cuántos continentes hay en el mundo?",
        options: ["5", "6", "7", "8"],
        correct: 2
    },
    {
        question: "¿Cuál es el animal terrestre más rápido?",
        options: ["León", "Guepardo", "Antílope", "Caballo"],
        correct: 1
    },
    {
        question: "¿En qué país se encuentra la Torre Eiffel?",
        options: ["Italia", "España", "Francia", "Alemania"],
        correct: 2
    },
    {
        question: "¿Cuál es el río más largo del mundo?",
        options: ["Nilo", "Amazonas", "Yangtsé", "Misisipi"],
        correct: 0
    },
    {
        question: "¿Quién fue el primer presidente de Estados Unidos?",
        options: ["Abraham Lincoln", "Thomas Jefferson", "George Washington", "John Adams"],
        correct: 2
    },
    {
        question: "¿Cuántos jugadores hay en un equipo de fútbol?",
        options: ["9", "10", "11", "12"],
        correct: 2
    },
    {
        question: "¿Cuál es el metal más abundante en la Tierra?",
        options: ["Hierro", "Aluminio", "Cobre", "Oro"],
        correct: 1
    },
    {
        question: "¿En qué año comenzó la Segunda Guerra Mundial?",
        options: ["1935", "1939", "1941", "1945"],
        correct: 1
    },
    {
        question: "¿Cuál es la montaña más alta del mundo?",
        options: ["K2", "Kilimanjaro", "Monte Everest", "Aconcagua"],
        correct: 2
    },
    {
        question: "¿Cuántos huesos tiene el cuerpo humano adulto?",
        options: ["186", "206", "226", "246"],
        correct: 1
    },
    {
        question: "¿Quién inventó la bombilla eléctrica?",
        options: ["Nikola Tesla", "Thomas Edison", "Benjamin Franklin", "Alexander Bell"],
        correct: 1
    },
    {
        question: "¿Cuál es el idioma más hablado en el mundo?",
        options: ["Inglés", "Español", "Chino mandarín", "Hindi"],
        correct: 2
    },
    {
        question: "¿En qué continente está Egipto?",
        options: ["Asia", "África", "Europa", "Oceanía"],
        correct: 1
    },
    {
        question: "¿Cuál es el órgano más grande del cuerpo humano?",
        options: ["Hígado", "Cerebro", "Pulmón", "Piel"],
        correct: 3
    }
];

function getRandomQuestions(count) {
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    socket.on('createRoom', (playerName) => {
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        rooms[roomCode] = {
            players: [{id: socket.id, name: playerName, score: 0, ready: false}],
            questions: getRandomQuestions(10),
            currentQuestion: 0,
            gameStarted: false
        };
        socket.join(roomCode);
        socket.emit('roomCreated', {roomCode, playerName});
        console.log(`Sala creada: ${roomCode}`);
    });

    socket.on('joinRoom', ({roomCode, playerName}) => {
        const room = rooms[roomCode];
        if (room && room.players.length < 2 && !room.gameStarted) {
            room.players.push({id: socket.id, name: playerName, score: 0, ready: false});
            socket.join(roomCode);
            io.to(roomCode).emit('playerJoined', {
                players: room.players,
                roomCode
            });
            console.log(`Jugador ${playerName} se unió a sala ${roomCode}`);
        } else if (room && room.gameStarted) {
            socket.emit('roomError', 'El juego ya ha comenzado');
        } else if (room && room.players.length >= 2) {
            socket.emit('roomError', 'La sala está llena');
        } else {
            socket.emit('roomError', 'Sala no encontrada');
        }
    });

    socket.on('playerReady', (roomCode) => {
        const room = rooms[roomCode];
        if (room) {
            const player = room.players.find(p => p.id === socket.id);
            if (player) {
                player.ready = true;
                io.to(roomCode).emit('playersUpdate', room.players);
                
                // Si ambos jugadores están listos, iniciar juego
                if (room.players.length === 2 && room.players.every(p => p.ready)) {
                    room.gameStarted = true;
                    setTimeout(() => {
                        sendQuestion(roomCode);
                    }, 2000);
                }
            }
        }
    });

    socket.on('submitAnswer', ({roomCode, answerIndex, timeLeft}) => {
        const room = rooms[roomCode];
        if (room) {
            const player = room.players.find(p => p.id === socket.id);
            const currentQ = room.questions[room.currentQuestion];
            
            if (player && currentQ) {
                const isCorrect = answerIndex === currentQ.correct;
                if (isCorrect) {
                    // Puntos basados en velocidad de respuesta
                    const points = Math.max(100, Math.floor(timeLeft * 10));
                    player.score += points;
                }
                
                socket.emit('answerResult', {
                    isCorrect,
                    correctAnswer: currentQ.correct,
                    points: isCorrect ? player.score : 0
                });
            }
        }
    });

    socket.on('nextQuestion', (roomCode) => {
        const room = rooms[roomCode];
        if (room) {
            room.currentQuestion++;
            if (room.currentQuestion < room.questions.length) {
                setTimeout(() => {
                    sendQuestion(roomCode);
                }, 3000);
            } else {
                // Juego terminado
                const winner = room.players.reduce((prev, current) => 
                    (prev.score > current.score) ? prev : current
                );
                io.to(roomCode).emit('gameOver', {
                    players: room.players,
                    winner: winner.name
                });
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('Usuario desconectado:', socket.id);
        // Buscar y limpiar salas
        for (const [roomCode, room] of Object.entries(rooms)) {
            const index = room.players.findIndex(p => p.id === socket.id);
            if (index !== -1) {
                room.players.splice(index, 1);
                if (room.players.length === 0) {
                    delete rooms[roomCode];
                } else {
                    io.to(roomCode).emit('playerLeft', room.players);
                }
                break;
            }
        }
    });
});

function sendQuestion(roomCode) {
    const room = rooms[roomCode];
    if (room) {
        const question = room.questions[room.currentQuestion];
        io.to(roomCode).emit('newQuestion', {
            question: question.question,
            options: question.options,
            questionNumber: room.currentQuestion + 1,
            totalQuestions: room.questions.length
        });
    }
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
