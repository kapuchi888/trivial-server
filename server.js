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

// ===== SISTEMA DE PREGUNTAS CON MEZCLA ESPAÑOL + TRADUCIDAS =====
let allQuestions = [];
let spanishQuestions = []; // Preguntas en español nativo
let usedQuestions = []; // Tracking de preguntas ya usadas
const CACHE_SIZE = 300; // Preguntas en caché inicial (ÓPTIMO)
const REFILL_THRESHOLD = 100; // Recargar cuando queden menos de 100

// Cargar preguntas en español desde archivo local
function loadSpanishQuestions() {
    try {
        console.log('🔍 Buscando archivo de preguntas españolas...');
        const questionsPath = path.join(__dirname, 'questions_espana.json');
        console.log('📂 Ruta: ' + questionsPath);
        
        if (fs.existsSync(questionsPath)) {
            console.log('✅ Archivo encontrado, cargando...');
            const data = fs.readFileSync(questionsPath, 'utf8');
            const questions = JSON.parse(data);
            console.log('📊 Preguntas leídas del archivo: ' + questions.length);
            // Formatear preguntas al formato del servidor
            const formatted = questions.map(q => {
                const allOptions = [...q.incorrect_answers, q.correct_answer];
                const shuffled = shuffleArray(allOptions);
                const correctIndex = shuffled.indexOf(q.correct_answer);
                
                return {
                    question: q.question,
                    options: shuffled,
                    correct: correctIndex,
                    category: q.category,
                    difficulty: q.difficulty || 'easy'
                };
            });
            
            console.log(`✅ Cargadas ${formatted.length} preguntas en ESPAÑOL NATIVO desde archivo`);
            return formatted;
        } else {
            console.log('⚠️ Archivo questions_espana.jason no encontrado');
            return [];
        }
    } catch (error) {
        console.log('⚠️ Error cargando preguntas españolas:', error.message);
        return [];
    }
}

// Función para traducir texto de inglés a español usando Google Translate
async function translateToSpanish(text) {
    try {
        const https = require('https');
        
        return new Promise((resolve) => {
            // Usar Google Translate API no oficial (más confiable)
            const encodedText = encodeURIComponent(text);
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=${encodedText}`;
            
            https.get(url, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        // Google Translate devuelve formato: [[[traducción, original, ...]]]
                        if (parsed && parsed[0] && parsed[0][0] && parsed[0][0][0]) {
                            const translated = parsed[0].map(item => item[0]).join('');
                            resolve(translated);
                        } else {
                            resolve(text); // Si falla, devolver original
                        }
                    } catch (e) {
                        console.log(`⚠️ Error traduciendo: ${text.substring(0, 30)}...`);
                        resolve(text);
                    }
                });
            }).on('error', (e) => {
                console.log(`⚠️ Error de conexión traduciendo`);
                resolve(text);
            });
            
            // Timeout de 3 segundos
            setTimeout(() => {
                resolve(text);
            }, 3000);
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
        // Pequeño delay para no saturar (Google es más rápido)
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    return translated;
}

// Función para obtener preguntas de QUIZ SPANISH (español nativo)
async function fetchQuestionsFromQuizSpanish(amount = 25) {
    try {
        const https = require('https');
        
        return new Promise((resolve) => {
            // Nota: Esta API puede no existir, usaremos Open Trivia como backup
            const url = `https://opentdb.com/api.php?amount=${amount}&difficulty=easy&type=multiple&encode=url3986`;
            
            https.get(url, (resp) => {
                let data = '';
                
                resp.on('data', (chunk) => {
                    data += chunk;
                });
                
                resp.on('end', async () => {
                    try {
                        const result = JSON.parse(data);
                        
                        if (result.results && result.results.length > 0) {
                            const formattedQuestions = [];
                            
                            for (let q of result.results) {
                                try {
                                    // Decodificar URL encoding
                                    const questionText = decodeURIComponent(q.question);
                                    const correctAnswer = decodeURIComponent(q.correct_answer);
                                    const incorrectAnswers = q.incorrect_answers.map(a => decodeURIComponent(a));
                                    const allOptions = [...incorrectAnswers, correctAnswer];
                                    
                                    // Traducir
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
                                        correct: correctIndex,
                                        category: decodeURIComponent(q.category),
                                        difficulty: 'easy'
                                    });
                                } catch (error) {
                                    console.log('⚠️ Error procesando pregunta de Quiz Spanish');
                                }
                            }
                            
                            console.log(`   ✅ ${formattedQuestions.length} preguntas FÁCILES obtenidas`);
                            resolve(formattedQuestions);
                        } else {
                            resolve([]);
                        }
                    } catch (error) {
                        console.log('⚠️ Error parseando Quiz Spanish:', error.message);
                        resolve([]);
                    }
                });
            }).on('error', (e) => {
                console.log('⚠️ Error de conexión con Quiz Spanish');
                resolve([]);
            });
        });
    } catch (error) {
        return [];
    }
}

// Función para obtener preguntas de The Trivia API CON TRADUCCIÓN (MEZCLA)
async function fetchQuestionsFromAPI(amount = 50) {
    try {
        const https = require('https');
        
        console.log(`📥 Descargando ${amount} preguntas (mezclando fuentes fáciles)...`);
        
        // Dividir entre ambas fuentes (75% Open Trivia easy, 25% The Trivia)
        const easyAmount = Math.floor(amount * 0.75);
        const mixedAmount = amount - easyAmount;
        
        // Obtener preguntas FÁCILES de Open Trivia
        const easyQuestions = await fetchQuestionsFromQuizSpanish(easyAmount);
        
        // Obtener algunas de The Trivia API (las más fáciles)
        return new Promise((resolve, reject) => {
            const url = `https://the-trivia-api.com/api/questions?limit=${mixedAmount}&difficulty=easy`;
            
            https.get(url, (resp) => {
                let data = '';
                
                resp.on('data', (chunk) => {
                    data += chunk;
                });
                
                resp.on('end', async () => {
                    try {
                        const questions = JSON.parse(data);
                        
                        if (Array.isArray(questions) && questions.length > 0) {
                            // Procesar preguntas de The Trivia API
                            const formattedQuestions = [];
                            
                            for (let q of questions) {
                                try {
                                    const questionText = q.question;
                                    const allOptions = [...q.incorrectAnswers, q.correctAnswer];
                                    
                                    // Traducir
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
                                        correct: correctIndex,
                                        category: q.category,
                                        difficulty: 'easy'
                                    });
                                } catch (error) {
                                    console.log('⚠️ Error procesando pregunta');
                                }
                            }
                            
                            console.log(`   ✅ ${formattedQuestions.length} preguntas fáciles de The Trivia`);
                            
                            // MEZCLAR AMBAS FUENTES
                            const allMixed = [...easyQuestions, ...formattedQuestions];
                            console.log(`✅ Total mezclado: ${allMixed.length} preguntas FÁCILES traducidas`);
                            
                            resolve(allMixed);
                        } else {
                            // Si falla The Trivia, devolver solo las fáciles
                            console.log(`✅ Total: ${easyQuestions.length} preguntas FÁCILES`);
                            resolve(easyQuestions);
                        }
                    } catch (error) {
                        console.log('Error parseando:', error);
                        resolve(easyQuestions); // Devolver al menos las fáciles
                    }
                });
            }).on('error', (e) => {
                console.log('Error de conexión:', e.message);
                resolve(easyQuestions); // Devolver al menos las fáciles
            });
        });
    } catch (error) {
        console.log('Error general:', error);
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
    console.log('🔄 Inicializando sistema con preguntas (ESPAÑOL + Traducidas)...');
    console.log('⏳ Esto tomará ~30-40 segundos...');
    
    // Cargar preguntas en español del archivo
    spanishQuestions = loadSpanishQuestions();
    
    // Usar TODAS las preguntas españolas disponibles
    const spanishCount = spanishQuestions.length; // TODAS las españolas
    const apiCount = 200; // APIs adicionales para variedad
    
    console.log(`📚 Usando ${spanishCount} preguntas en ESPAÑOL NATIVO (TODAS)`);
    console.log(`🌐 Descargando ${apiCount} preguntas FÁCILES traducidas adicionales...`);
    
    // Tomar TODAS las preguntas españolas
    const selectedSpanish = shuffleArray([...spanishQuestions]); // TODAS
    
    // Descargar preguntas de APIs (fáciles)
    const allFetched = [];
    const batches = Math.ceil(apiCount / 50); // Lotes de 50
    for (let i = 0; i < batches; i++) {
        console.log(`📥 Descargando lote ${i + 1}/${batches} de APIs...`);
        const batch = await fetchQuestionsFromAPI(50);
        if (batch.length > 0) {
            allFetched.push(...batch);
        }
        // Pequeña pausa entre lotes
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // MEZCLAR ambas fuentes
    const mixedQuestions = [...selectedSpanish, ...allFetched.slice(0, apiCount)];
    
    if (mixedQuestions.length > 0) {
        // Hacer shuffle UNA VEZ al cargar
        allQuestions = shuffleArray(mixedQuestions);
        console.log(`✅ Sistema listo con ${allQuestions.length} preguntas totales`);
        console.log(`   🇪🇸 ${spanishCount} en español nativo (TODAS las disponibles)`);
        console.log(`   🌐 ${allFetched.length} traducidas fáciles adicionales`);
        console.log(`🎮 ¡Máxima variedad con preguntas españolas + APIs!`);
    } else {
        // Usar solo españolas como respaldo
        allQuestions = shuffleArray(spanishQuestions);
        console.log(`📁 Sistema usando ${allQuestions.length} preguntas españolas`);
    }
}

// Recargar preguntas automáticamente cuando se agoten
async function refillQuestionsIfNeeded() {
    if (allQuestions.length < REFILL_THRESHOLD) {
        console.log(`🔄 Recargando preguntas (quedan ${allQuestions.length})...`);
        
        // Mezcla: 60% español + 40% APIs
        const spanishRefill = 60;
        const apiRefill = 40;
        
        // Tomar más preguntas españolas del pool
        const availableSpanish = spanishQuestions.filter(sq => 
            !allQuestions.some(aq => aq.question === sq.question)
        );
        const selectedSpanish = shuffleArray(availableSpanish).slice(0, spanishRefill);
        
        // Descargar de APIs
        const allFetched = [];
        const batches = Math.ceil(apiRefill / 50);
        for (let i = 0; i < batches; i++) {
            const batch = await fetchQuestionsFromAPI(50);
            if (batch.length > 0) {
                allFetched.push(...batch);
            }
        }
        
        // Mezclar y añadir
        const newQuestions = [...selectedSpanish, ...allFetched.slice(0, apiRefill)];
        
        if (newQuestions.length > 0) {
            const shuffledNew = shuffleArray(newQuestions);
            allQuestions.push(...shuffledNew);
            console.log(`✅ Agregadas ${newQuestions.length} preguntas (${selectedSpanish.length} español + ${allFetched.slice(0, apiRefill).length} API). Total: ${allQuestions.length}`);
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
    
    // Si no hay suficientes preguntas, recargar inmediatamente
    if (allQuestions.length < count) {
        console.log(`⚠️ No hay suficientes preguntas (${allQuestions.length}), recargando...`);
        // En este caso, resetear y usar las que hay
        return allQuestions.slice(0, count);
    }
    
    // Tomar las primeras 'count' preguntas del array
    const selected = allQuestions.splice(0, count);
    
    console.log(`📤 Enviadas ${selected.length} preguntas. Quedan ${allQuestions.length} en el pool`);
    
    return selected;
}

// Socket.IO eventos
io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    socket.on('createRoom', (data) => {
        const playerName = typeof data === 'string' ? data : data.playerName;
        const mode = (typeof data === 'object' && data.mode) ? data.mode : 'normal';
        const totalRounds = (typeof data === 'object' && data.totalRounds) ? data.totalRounds : 1;
        const questionsPerRound = (typeof data === 'object' && data.questionsPerRound) ? data.questionsPerRound : 15;
        const maxPlayers = 4; // Máximo 4 jugadores
        const totalQuestions = questionsPerRound * maxPlayers * totalRounds; // Preguntas para todas las rondas
        
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
            totalRounds: totalRounds,
            currentRound: 1,
            questionsPerRound: questionsPerRound,
            roundScores: [], // Puntuaciones por ronda
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
        
        // Verificar si todos terminaron esta ronda
        if (room.players.every(p => p.questionsAnswered >= room.questionsPerRound * room.currentRound)) {
            setTimeout(() => {
                // Guardar puntuaciones de esta ronda
                if (!room.roundScores[room.currentRound - 1]) {
                    room.roundScores[room.currentRound - 1] = room.players.map(p => ({
                        name: p.name,
                        score: p.score
                    }));
                }
                
                // Verificar si hay más rondas
                if (room.currentRound < room.totalRounds) {
                    // Mostrar ranking parcial y continuar
                    const ranking = [...room.players].sort((a, b) => b.score - a.score);
                    io.to(roomCode).emit('roundEnd', {
                        ranking: ranking,
                        currentRound: room.currentRound,
                        totalRounds: room.totalRounds
                    });
                    
                    // Preparar siguiente ronda
                    setTimeout(() => {
                        room.currentRound++;
                        room.players.forEach(p => p.hasAnswered = false);
                        sendQuestion(roomCode);
                    }, 5000);
                } else {
                    // Fin del juego completo
                    const ranking = [...room.players].sort((a, b) => b.score - a.score);
                    io.to(roomCode).emit('gameOver', {
                        players: room.players,
                        ranking: ranking,
                        winner: ranking[0].name,
                        totalRounds: room.totalRounds
                    });
                    delete rooms[roomCode];
                }
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
            
            // Verificar si todos terminaron esta ronda
            if (room.players.every(p => p.questionsAnswered >= room.questionsPerRound * room.currentRound)) {
                // Guardar puntuaciones de esta ronda
                if (!room.roundScores[room.currentRound - 1]) {
                    room.roundScores[room.currentRound - 1] = room.players.map(p => ({
                        name: p.name,
                        score: p.score
                    }));
                }
                
                // Verificar si hay más rondas
                if (room.currentRound < room.totalRounds) {
                    const ranking = [...room.players].sort((a, b) => b.score - a.score);
                    io.to(roomCode).emit('roundEnd', {
                        ranking: ranking,
                        currentRound: room.currentRound,
                        totalRounds: room.totalRounds
                    });
                    
                    setTimeout(() => {
                        room.currentRound++;
                        room.players.forEach(p => p.hasAnswered = false);
                        sendQuestion(roomCode);
                    }, 5000);
                } else {
                    // Fin del juego
                    const ranking = [...room.players].sort((a, b) => b.score - a.score);
                    const winner = ranking.reduce((max, p) => 
                        p.score > max.score ? p : max
                    );
                    io.to(roomCode).emit('gameOver', {
                        players: room.players,
                        ranking: ranking,
                        winner: winner.name,
                        totalRounds: room.totalRounds
                    });
                    delete rooms[roomCode];
                }
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
        totalQuestions: room.questionsPerRound,
        currentRound: room.currentRound,
        totalRounds: room.totalRounds
    });
    
    // Enviar "esperando" a TODOS los demás jugadores
    room.players.forEach((player, index) => {
        if (index !== room.currentPlayerIndex) {
            io.to(player.id).emit('waitingTurn', {
                currentPlayerName: currentPlayer.name,
                allPlayers: room.players,
                currentRound: room.currentRound,
                totalRounds: room.totalRounds
            });
        }
    });
}

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Inicializar y arrancar servidor
(async () => {
    try {
        console.log('🚀 Iniciando servidor Trivial Kapuchi...');
        await initializeQuestions();
        
        server.listen(PORT, () => {
            console.log(`🚀 Servidor Trivial Kapuchi corriendo en puerto ${PORT}`);
            console.log(`📚 Preguntas disponibles: ${allQuestions.length}`);
        });
    } catch (error) {
        console.error('❌ Error fatal al iniciar servidor:', error);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
})();
