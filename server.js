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

// API para obtener preguntas aleatorias (modo CPU)
app.get('/api/questions', (req, res) => {
    const count = parseInt(req.query.count) || 10;
    const questions = getRandomQuestions(count);
    res.json(questions);
});

// Variables del servidor
const rooms = {};

// ===== SISTEMA DE PREGUNTAS CON OPEN TRIVIA DB Y TRADUCCIÓN =====
let allQuestions = [];
const CACHE_SIZE = 200; // Preguntas en caché
const REFILL_THRESHOLD = 50; // Recargar cuando queden menos de 50

// Función para traducir texto de inglés a español
async function translateToSpanish(text) {
    try {
        const https = require('https');
        const querystring = require('querystring');
        
        return new Promise((resolve, reject) => {
            // Usar MyMemory Translation API (más confiable)
            const encodedText = encodeURIComponent(text);
            const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=en|es`;
            
            https.get(url, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        if (json.responseData && json.responseData.translatedText) {
                            resolve(json.responseData.translatedText);
                        } else {
                            resolve(text); // Si falla, devolver original
                        }
                    } catch (e) {
                        resolve(text);
                    }
                });
            }).on('error', (e) => {
                resolve(text);
            });
            
            // Timeout de 5 segundos
            setTimeout(() => {
                resolve(text);
            }, 5000);
        });
    } catch (error) {
        return text;
    }
}

// Función para traducir un lote de textos
async function translateBatch(texts) {
    const translated = [];
    for (let text of texts) {
        const result = await translateToSpanish(text);
        translated.push(result);
        // Pequeño delay para no saturar la API
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return translated;
}

// Función para obtener preguntas de Open Trivia DB
async function fetchQuestionsFromAPI(amount = 50) {
    try {
        const https = require('https');
        
        return new Promise((resolve, reject) => {
            const url = `https://opentdb.com/api.php?amount=${amount}&type=multiple`;
            
            https.get(url, (resp) => {
                let data = '';
                
                resp.on('data', (chunk) => {
                    data += chunk;
                });
                
                resp.on('end', async () => {
                    try {
                        const json = JSON.parse(data);
                        
                        if (json.response_code === 0 && json.results) {
                            console.log(`📥 Descargadas ${json.results.length} preguntas, traduciendo...`);
                            
                            // Procesar preguntas
                            const formattedQuestions = [];
                            
                            for (let q of json.results) {
                                // Decodificar HTML entities
                                const decodeHTML = (html) => {
                                    return html
                                        .replace(/&quot;/g, '"')
                                        .replace(/&#039;/g, "'")
                                        .replace(/&amp;/g, '&')
                                        .replace(/&lt;/g, '<')
                                        .replace(/&gt;/g, '>')
                                        .replace(/&ntilde;/g, 'ñ')
                                        .replace(/&aacute;/g, 'á')
                                        .replace(/&eacute;/g, 'é')
                                        .replace(/&iacute;/g, 'í')
                                        .replace(/&oacute;/g, 'ó')
                                        .replace(/&uacute;/g, 'ú');
                                };
                                
                                // Preparar textos para traducir
                                const questionText = decodeHTML(q.question);
                                const allOptions = [...q.incorrect_answers.map(decodeHTML), decodeHTML(q.correct_answer)];
                                
                                // Traducir pregunta y opciones
                                const textsToTranslate = [questionText, ...allOptions];
                                const translated = await translateBatch(textsToTranslate);
                                
                                const translatedQuestion = translated[0];
                                const translatedOptions = translated.slice(1);
                                
                                // Mezclar opciones
                                const shuffled = shuffleArray(translatedOptions);
                                const correctIndex = shuffled.indexOf(translated[translated.length - 1]);
                                
                                formattedQuestions.push({
                                    question: translatedQuestion,
                                    options: shuffled,
                                    correct: correctIndex
                                });
                            }
                            
                            console.log(`✅ ${formattedQuestions.length} preguntas traducidas al español`);
                            resolve(formattedQuestions);
                        } else {
                            reject(new Error('API response error'));
                        }
                    } catch (e) {
                        reject(e);
                    }
                });
            }).on('error', (err) => {
                reject(err);
            });
        });
    } catch (error) {
        console.error('❌ Error al obtener preguntas de API:', error.message);
        return [];
    }
}

// Función para cargar preguntas locales de respaldo
function loadLocalQuestions() {
    try {
        const localQuestions = JSON.parse(fs.readFileSync('./questions.json', 'utf8'));
        console.log(`📁 Cargadas ${localQuestions.length} preguntas locales de respaldo`);
        return localQuestions;
    } catch (error) {
        console.log('⚠️ No se encontró questions.json, usando preguntas mínimas');
        return [
            { question: "¿Capital de Francia?", options: ["Londres", "París", "Berlín", "Madrid"], correct: 1 },
            { question: "¿Capital de España?", options: ["Barcelona", "Madrid", "Sevilla", "Valencia"], correct: 1 },
            { question: "¿Capital de Italia?", options: ["Milán", "Roma", "Nápoles", "Florencia"], correct: 1 },
            { question: "¿Planeta más grande?", options: ["Tierra", "Júpiter", "Marte", "Saturno"], correct: 1 },
            { question: "¿Océano más grande?", options: ["Atlántico", "Pacífico", "Índico", "Ártico"], correct: 1 }
        ];
    }
}

// Inicializar preguntas al arrancar
async function initializeQuestions() {
    console.log('🔄 Inicializando sistema de preguntas...');
    
    // Intentar cargar de la API
    const apiQuestions = await fetchQuestionsFromAPI(50); // Empezar con 50 para que sea más rápido
    
    if (apiQuestions.length > 0) {
        allQuestions = apiQuestions;
        console.log(`✅ Sistema listo con ${allQuestions.length} preguntas traducidas`);
    } else {
        // Usar preguntas locales como respaldo
        allQuestions = loadLocalQuestions();
        console.log(`📁 Sistema usando ${allQuestions.length} preguntas locales`);
    }
}

// Recargar preguntas automáticamente cuando se agoten
async function refillQuestionsIfNeeded() {
    if (allQuestions.length < REFILL_THRESHOLD) {
        console.log(`🔄 Recargando preguntas (quedan ${allQuestions.length})...`);
        const newQuestions = await fetchQuestionsFromAPI(50);
        if (newQuestions.length > 0) {
            allQuestions.push(...newQuestions);
            console.log(`✅ Agregadas ${newQuestions.length} preguntas nuevas. Total: ${allQuestions.length}`);
        }
    }
}

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
    // Recargar si es necesario (sin esperar)
    refillQuestionsIfNeeded();
    
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
        const maxPlayers = 4; // Máximo 4 jugadores
        const totalQuestions = questionsPerPlayer * maxPlayers; // Preparar para 4 jugadores
        
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
            maxPlayers: maxPlayers,
            questions: getRandomQuestions(totalQuestions)
        };
        socket.join(roomCode);
        socket.emit('roomCreated', { roomCode, playerName });
    });

    socket.on('joinRoom', ({roomCode, playerName}) => {
        // Limpiar código: quitar espacios y convertir a mayúsculas
        const cleanRoomCode = roomCode.trim().toUpperCase();
        
        console.log('🔍 Intento de unión:', cleanRoomCode);
        console.log('📚 Salas disponibles:', Object.keys(rooms));
        
        const room = rooms[cleanRoomCode];
        if (!room) {
            console.log('❌ Sala no encontrada:', cleanRoomCode);
            socket.emit('roomError', 'Sala no encontrada');
            return;
        }
        if (room.players.length >= room.maxPlayers) {
            console.log('❌ Sala llena:', cleanRoomCode);
            socket.emit('roomError', 'Sala llena (máximo 4 jugadores)');
            return;
        }
        
        console.log('✅ Jugador unido a sala:', cleanRoomCode);
        
        room.players.push({
            id: socket.id,
            name: playerName,
            ready: false,
            score: 0,
            questionsAnswered: 0
        });
        socket.join(cleanRoomCode);
        io.to(cleanRoomCode).emit('playerJoined', {
            roomCode: cleanRoomCode,
            players: room.players
        });
    });

    socket.on('playerReady', (roomCode) => {
        const room = rooms[roomCode];
        if (!room) return;
        
        const player = room.players.find(p => p.id === socket.id);
        if (player) player.ready = true;
        
        io.to(roomCode).emit('playersUpdate', room.players);
        
        // Empezar cuando hay al menos 2 jugadores y todos están listos
        if (room.players.length >= 2 && room.players.every(p => p.ready)) {
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
        
        // Verificar si el juego terminó (todos los jugadores completaron sus preguntas)
        if (room.players.every(p => p.questionsAnswered >= room.questionsPerPlayer)) {
            // Fin del juego - Crear ranking
            setTimeout(() => {
                // Ordenar jugadores por puntuación (mayor a menor)
                const ranking = [...room.players].sort((a, b) => b.score - a.score);
                
                io.to(roomCode).emit('gameOver', {
                    players: room.players,
                    ranking: ranking,
                    winner: ranking[0].name
                });
                delete rooms[roomCode];
            }, 2000);
        } else {
            // Continuar con siguiente turno
            setTimeout(() => {
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
        
        // Cambiar de turno (rotar entre todos los jugadores)
        room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
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
    
    // Enviar pregunta solo al jugador actual
    io.to(currentPlayer.id).emit('newQuestion', {
        question: question.question,
        options: question.options,
        questionNumber: currentPlayer.questionsAnswered + 1,
        totalQuestions: room.questionsPerPlayer
    });
    
    // Enviar "esperando" a TODOS los demás jugadores
    room.players.forEach((player, index) => {
        if (index !== room.currentPlayerIndex) {
            io.to(player.id).emit('waitingTurn', {
                currentPlayerName: currentPlayer.name,
                allPlayers: room.players
            });
        }
    });
}

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Inicializar y arrancar servidor
(async () => {
    await initializeQuestions();
    
    server.listen(PORT, () => {
        console.log(`🚀 Servidor Trivial Kapuchi corriendo en puerto ${PORT}`);
        console.log(`📚 Preguntas disponibles: ${allQuestions.length}`);
    });
})();
