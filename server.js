const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/api/questions', async (req, res) => {
    const count = parseInt(req.query.count) || 10;
    if (allQuestions.length < count) {
        await refillQuestionsIfNeeded(count + 50);
    }
    res.json(getRandomQuestions(count));
});

const rooms = {};
let allQuestions = [];
let spanishQuestions = [];
const REFILL_THRESHOLD = 100;

// 200 PREGUNTAS DE RESPALDO
const backupQuestions = [
    // GEOGRAFÍA
    { question: "¿Cuál es la capital de Francia?", options: ["Londres", "París", "Berlín", "Madrid"], correct: 1 },
    { question: "¿Cuál es la capital de España?", options: ["Barcelona", "Madrid", "Sevilla", "Valencia"], correct: 1 },
    { question: "¿Cuál es la capital de Italia?", options: ["Milán", "Roma", "Nápoles", "Florencia"], correct: 1 },
    { question: "¿Cuál es la capital de Alemania?", options: ["Múnich", "Berlín", "Hamburgo", "Frankfurt"], correct: 1 },
    { question: "¿Cuál es la capital de Portugal?", options: ["Oporto", "Lisboa", "Faro", "Coímbra"], correct: 1 },
    { question: "¿Cuál es la capital de Reino Unido?", options: ["Manchester", "Londres", "Liverpool", "Birmingham"], correct: 1 },
    { question: "¿Cuál es la capital de Japón?", options: ["Osaka", "Tokio", "Kioto", "Hiroshima"], correct: 1 },
    { question: "¿Cuál es la capital de China?", options: ["Shanghái", "Pekín", "Hong Kong", "Cantón"], correct: 1 },
    { question: "¿Cuál es la capital de Brasil?", options: ["Río de Janeiro", "Brasilia", "São Paulo", "Salvador"], correct: 1 },
    { question: "¿Cuál es la capital de Argentina?", options: ["Córdoba", "Buenos Aires", "Rosario", "Mendoza"], correct: 1 },
    { question: "¿Cuál es la capital de México?", options: ["Guadalajara", "Ciudad de México", "Monterrey", "Cancún"], correct: 1 },
    { question: "¿Cuál es la capital de Estados Unidos?", options: ["Nueva York", "Washington D.C.", "Los Ángeles", "Chicago"], correct: 1 },
    { question: "¿Cuál es el río más largo del mundo?", options: ["Amazonas", "Nilo", "Yangtsé", "Misisipi"], correct: 1 },
    { question: "¿Cuál es el océano más grande?", options: ["Atlántico", "Pacífico", "Índico", "Ártico"], correct: 1 },
    { question: "¿En qué continente está Egipto?", options: ["Asia", "África", "Europa", "Oceanía"], correct: 1 },
    { question: "¿Cuál es el país más grande del mundo?", options: ["China", "Rusia", "Canadá", "Estados Unidos"], correct: 1 },
    { question: "¿Cuál es la montaña más alta del mundo?", options: ["K2", "Everest", "Kilimanjaro", "Mont Blanc"], correct: 1 },
    { question: "¿En qué país está la Torre Eiffel?", options: ["Italia", "Francia", "España", "Alemania"], correct: 1 },
    { question: "¿En qué país está el Coliseo?", options: ["Grecia", "Italia", "España", "Turquía"], correct: 1 },
    { question: "¿En qué país está la Sagrada Familia?", options: ["Portugal", "España", "Italia", "Francia"], correct: 1 },
    { question: "¿Cuál es la capital de Rusia?", options: ["San Petersburgo", "Moscú", "Kiev", "Minsk"], correct: 1 },
    { question: "¿Cuál es el desierto más grande del mundo?", options: ["Gobi", "Sahara", "Kalahari", "Atacama"], correct: 1 },
    { question: "¿Cuántos continentes hay?", options: ["5", "7", "6", "8"], correct: 1 },
    { question: "¿En qué país está Machu Picchu?", options: ["Bolivia", "Perú", "Ecuador", "Colombia"], correct: 1 },
    { question: "¿Cuál es la capital de Grecia?", options: ["Tesalónica", "Atenas", "Creta", "Esparta"], correct: 1 },
    { question: "¿En qué país está la Gran Muralla?", options: ["Japón", "China", "Corea", "Mongolia"], correct: 1 },
    { question: "¿Cuál es la capital de Egipto?", options: ["Alejandría", "El Cairo", "Luxor", "Giza"], correct: 1 },
    { question: "¿En qué país está el Taj Mahal?", options: ["Pakistán", "India", "Bangladesh", "Nepal"], correct: 1 },
    { question: "¿Cuál es la capital de Turquía?", options: ["Estambul", "Ankara", "Izmir", "Antalya"], correct: 1 },
    { question: "¿Cuál es la capital de Canadá?", options: ["Toronto", "Ottawa", "Montreal", "Vancouver"], correct: 1 },
    { question: "¿Cuál es la capital de Australia?", options: ["Sídney", "Canberra", "Melbourne", "Brisbane"], correct: 1 },
    { question: "¿En qué país está Venecia?", options: ["Francia", "Italia", "Grecia", "Croacia"], correct: 1 },
    { question: "¿Cuál es la capital de Suiza?", options: ["Zúrich", "Berna", "Ginebra", "Basilea"], correct: 1 },
    { question: "¿En qué país está Ámsterdam?", options: ["Bélgica", "Países Bajos", "Alemania", "Dinamarca"], correct: 1 },
    { question: "¿Cuál es la capital de Austria?", options: ["Salzburgo", "Viena", "Innsbruck", "Graz"], correct: 1 },
    
    // CIENCIA
    { question: "¿Cuál es el planeta más grande del sistema solar?", options: ["Tierra", "Júpiter", "Saturno", "Neptuno"], correct: 1 },
    { question: "¿Cuál es el planeta más cercano al Sol?", options: ["Venus", "Mercurio", "Marte", "Tierra"], correct: 1 },
    { question: "¿Cuántos planetas hay en el sistema solar?", options: ["7", "8", "9", "10"], correct: 1 },
    { question: "¿Qué gas respiramos principalmente?", options: ["Oxígeno", "Nitrógeno", "CO2", "Hidrógeno"], correct: 0 },
    { question: "¿Cuál es el símbolo químico del oro?", options: ["Ag", "Au", "Fe", "Cu"], correct: 1 },
    { question: "¿Cuál es el símbolo químico del agua?", options: ["O2", "H2O", "CO2", "NaCl"], correct: 1 },
    { question: "¿Cuántos huesos tiene el cuerpo humano adulto?", options: ["196", "206", "216", "226"], correct: 1 },
    { question: "¿Cuál es el órgano más grande del cuerpo?", options: ["Hígado", "Piel", "Cerebro", "Intestino"], correct: 1 },
    { question: "¿Qué científico descubrió la gravedad?", options: ["Einstein", "Newton", "Galileo", "Darwin"], correct: 1 },
    { question: "¿Cuál es el animal más grande del mundo?", options: ["Elefante", "Ballena azul", "Jirafa", "Tiburón"], correct: 1 },
    { question: "¿Cuántas patas tiene una araña?", options: ["6", "8", "10", "12"], correct: 1 },
    { question: "¿Qué tipo de animal es la ballena?", options: ["Pez", "Mamífero", "Reptil", "Anfibio"], correct: 1 },
    { question: "¿Cuál es el punto de ebullición del agua?", options: ["90°C", "100°C", "110°C", "120°C"], correct: 1 },
    { question: "¿Quién inventó la bombilla?", options: ["Tesla", "Edison", "Bell", "Franklin"], correct: 1 },
    { question: "¿Cuál es el elemento más abundante en el universo?", options: ["Oxígeno", "Hidrógeno", "Carbono", "Helio"], correct: 1 },
    { question: "¿Cuántos cromosomas tiene el ser humano?", options: ["23", "46", "48", "44"], correct: 1 },
    { question: "¿Qué planeta es conocido como el planeta rojo?", options: ["Venus", "Marte", "Júpiter", "Mercurio"], correct: 1 },
    { question: "¿Qué tipo de sangre es el donante universal?", options: ["A", "O negativo", "AB", "B"], correct: 1 },
    { question: "¿Cuántos dientes tiene un adulto?", options: ["28", "32", "30", "34"], correct: 1 },
    { question: "¿Qué vitamina proporciona el sol?", options: ["A", "D", "C", "B12"], correct: 1 },
    { question: "¿Cuál es el hueso más largo del cuerpo?", options: ["Húmero", "Fémur", "Tibia", "Radio"], correct: 1 },
    { question: "¿Cuál es la estrella más cercana a la Tierra?", options: ["Alfa Centauri", "Sol", "Sirio", "Betelgeuse"], correct: 1 },
    { question: "¿Qué órgano bombea la sangre?", options: ["Pulmón", "Corazón", "Hígado", "Riñón"], correct: 1 },
    { question: "¿Cuál es el gas más abundante en la atmósfera?", options: ["Oxígeno", "Nitrógeno", "CO2", "Argón"], correct: 1 },
    { question: "¿Cuántos sentidos tiene el ser humano?", options: ["4", "5", "6", "7"], correct: 1 },
    { question: "¿Qué planeta tiene anillos visibles?", options: ["Júpiter", "Saturno", "Urano", "Neptuno"], correct: 1 },
    { question: "¿Qué inventó Alexander Graham Bell?", options: ["Radio", "Teléfono", "Televisión", "Internet"], correct: 1 },
    { question: "¿Qué científico propuso la teoría de la relatividad?", options: ["Newton", "Einstein", "Hawking", "Bohr"], correct: 1 },
    { question: "¿Cuál es el metal líquido a temperatura ambiente?", options: ["Plomo", "Mercurio", "Estaño", "Zinc"], correct: 1 },
    { question: "¿Qué estudia la botánica?", options: ["Animales", "Plantas", "Rocas", "Estrellas"], correct: 1 },
    
    // HISTORIA
    { question: "¿En qué año llegó Colón a América?", options: ["1482", "1492", "1502", "1512"], correct: 1 },
    { question: "¿En qué año comenzó la Segunda Guerra Mundial?", options: ["1935", "1939", "1941", "1945"], correct: 1 },
    { question: "¿En qué año terminó la Segunda Guerra Mundial?", options: ["1943", "1945", "1947", "1950"], correct: 1 },
    { question: "¿Quién fue el primer presidente de Estados Unidos?", options: ["Lincoln", "Washington", "Jefferson", "Adams"], correct: 1 },
    { question: "¿En qué año cayó el Muro de Berlín?", options: ["1987", "1989", "1991", "1993"], correct: 1 },
    { question: "¿Quién pintó la Mona Lisa?", options: ["Miguel Ángel", "Leonardo da Vinci", "Rafael", "Botticelli"], correct: 1 },
    { question: "¿En qué año llegó el hombre a la Luna?", options: ["1967", "1969", "1971", "1973"], correct: 1 },
    { question: "¿Quién escribió Don Quijote?", options: ["Lope de Vega", "Cervantes", "Quevedo", "Calderón"], correct: 1 },
    { question: "¿En qué año se hundió el Titanic?", options: ["1910", "1912", "1914", "1916"], correct: 1 },
    { question: "¿Quién descubrió América?", options: ["Vasco da Gama", "Cristóbal Colón", "Magallanes", "Vespucio"], correct: 1 },
    { question: "¿En qué año comenzó la Primera Guerra Mundial?", options: ["1912", "1914", "1916", "1918"], correct: 1 },
    { question: "¿Qué civilización inventó la democracia?", options: ["Romana", "Griega", "Egipcia", "Persa"], correct: 1 },
    { question: "¿Quién fue Napoleón Bonaparte?", options: ["Rey de Francia", "Emperador francés", "Presidente", "Duque"], correct: 1 },
    { question: "¿Qué país lanzó la primera bomba atómica?", options: ["Alemania", "Estados Unidos", "Rusia", "Japón"], correct: 1 },
    { question: "¿Quién fue Martin Luther King?", options: ["Presidente", "Activista derechos civiles", "Científico", "Escritor"], correct: 1 },
    { question: "¿Quién fue el primer emperador romano?", options: ["Julio César", "Augusto", "Nerón", "Calígula"], correct: 1 },
    { question: "¿Qué país inició la Revolución Industrial?", options: ["Francia", "Inglaterra", "Alemania", "Estados Unidos"], correct: 1 },
    { question: "¿Quién fue Mahatma Gandhi?", options: ["Emperador indio", "Líder independentista", "Presidente", "Rey"], correct: 1 },
    { question: "¿Quién fue Simón Bolívar?", options: ["Conquistador", "Libertador de América", "Rey de España", "Virrey"], correct: 1 },
    { question: "¿Qué imperio dominó gran parte de América del Sur?", options: ["Azteca", "Inca", "Maya", "Olmeca"], correct: 1 },
    { question: "¿En qué año terminó la Guerra Civil Española?", options: ["1936", "1939", "1942", "1945"], correct: 1 },
    { question: "¿Quién inventó la imprenta?", options: ["Da Vinci", "Gutenberg", "Galileo", "Newton"], correct: 1 },
    { question: "¿Quién fue Abraham Lincoln?", options: ["Primer presidente", "Presidente Guerra Civil", "Último presidente", "Fundador"], correct: 1 },
    { question: "¿En qué año terminó la Guerra Fría?", options: ["1985", "1989", "1991", "1995"], correct: 2 },
    { question: "¿Quién fue Cleopatra?", options: ["Emperatriz romana", "Reina de Egipto", "Diosa griega", "Princesa"], correct: 1 },
    
    // ENTRETENIMIENTO
    { question: "¿Quién interpretó a Jack en Titanic?", options: ["Brad Pitt", "Leonardo DiCaprio", "Tom Cruise", "Johnny Depp"], correct: 1 },
    { question: "¿Cómo se llama el protagonista de Mario Bros?", options: ["Luigi", "Mario", "Wario", "Toad"], correct: 1 },
    { question: "¿Qué banda cantó 'Bohemian Rhapsody'?", options: ["The Beatles", "Queen", "Led Zeppelin", "Pink Floyd"], correct: 1 },
    { question: "¿Quién es el creador de Mickey Mouse?", options: ["Pixar", "Walt Disney", "Warner Bros", "DreamWorks"], correct: 1 },
    { question: "¿En qué película aparece Darth Vader?", options: ["Star Trek", "Star Wars", "Alien", "Blade Runner"], correct: 1 },
    { question: "¿Cuántos jugadores hay en un equipo de fútbol?", options: ["9", "11", "10", "12"], correct: 1 },
    { question: "¿Quién escribió 'Romeo y Julieta'?", options: ["Dickens", "Shakespeare", "Cervantes", "Dante"], correct: 1 },
    { question: "¿De qué país es el grupo ABBA?", options: ["Noruega", "Suecia", "Finlandia", "Dinamarca"], correct: 1 },
    { question: "¿Qué superhéroe es de Krypton?", options: ["Batman", "Superman", "Spiderman", "Flash"], correct: 1 },
    { question: "¿Quién es el archienemigo de Batman?", options: ["Lex Luthor", "Joker", "Thanos", "Magneto"], correct: 1 },
    { question: "¿En qué saga aparece Frodo?", options: ["Harry Potter", "El Señor de los Anillos", "Narnia", "Eragon"], correct: 1 },
    { question: "¿Quién canta 'Thriller'?", options: ["Prince", "Michael Jackson", "Stevie Wonder", "James Brown"], correct: 1 },
    { question: "¿De qué país es el anime?", options: ["China", "Japón", "Corea", "Tailandia"], correct: 1 },
    { question: "¿Cómo se llama el protagonista de Zelda?", options: ["Zelda", "Link", "Ganondorf", "Epona"], correct: 1 },
    { question: "¿Quién es el creador de Facebook?", options: ["Bill Gates", "Mark Zuckerberg", "Steve Jobs", "Elon Musk"], correct: 1 },
    { question: "¿Cuántas casillas tiene un tablero de ajedrez?", options: ["36", "64", "81", "100"], correct: 1 },
    { question: "¿Qué banda cantó 'Smells Like Teen Spirit'?", options: ["Pearl Jam", "Nirvana", "Soundgarden", "Alice in Chains"], correct: 1 },
    { question: "¿Quién dirigió Titanic?", options: ["Spielberg", "James Cameron", "Scorsese", "Tarantino"], correct: 1 },
    { question: "¿Qué compañía creó el PlayStation?", options: ["Nintendo", "Sony", "Microsoft", "Sega"], correct: 1 },
    { question: "¿Cuántos libros hay de Harry Potter?", options: ["5", "7", "8", "6"], correct: 1 },
    { question: "¿Quién escribió Harry Potter?", options: ["Stephen King", "J.K. Rowling", "Tolkien", "C.S. Lewis"], correct: 1 },
    { question: "¿En qué casa de Hogwarts está Harry?", options: ["Slytherin", "Gryffindor", "Ravenclaw", "Hufflepuff"], correct: 1 },
    { question: "¿Qué superhéroe es Peter Parker?", options: ["Batman", "Spiderman", "Superman", "Iron Man"], correct: 1 },
    { question: "¿Quién es Tony Stark?", options: ["Capitán América", "Iron Man", "Thor", "Hulk"], correct: 1 },
    { question: "¿Cuál es el verdadero nombre de Batman?", options: ["Clark Kent", "Bruce Wayne", "Peter Parker", "Tony Stark"], correct: 1 },
    { question: "¿Qué deporte practica Messi?", options: ["Baloncesto", "Fútbol", "Tenis", "Golf"], correct: 1 },
    { question: "¿En qué país se celebró el Mundial 2022?", options: ["Rusia", "Qatar", "Brasil", "Alemania"], correct: 1 },
    { question: "¿Quién ganó el Mundial 2022?", options: ["Francia", "Argentina", "Brasil", "Croacia"], correct: 1 },
    { question: "¿Qué país ha ganado más mundiales de fútbol?", options: ["Alemania", "Brasil", "Argentina", "Italia"], correct: 1 },
    
    // CULTURA GENERAL
    { question: "¿Cuántos días tiene un año bisiesto?", options: ["365", "366", "364", "367"], correct: 1 },
    { question: "¿Cuántos minutos tiene una hora?", options: ["30", "60", "90", "120"], correct: 1 },
    { question: "¿Cuál es el color del semáforo para parar?", options: ["Verde", "Rojo", "Amarillo", "Azul"], correct: 1 },
    { question: "¿Cuántos colores tiene el arcoíris?", options: ["5", "7", "6", "8"], correct: 1 },
    { question: "¿Cuántas letras tiene el abecedario español?", options: ["26", "27", "28", "29"], correct: 1 },
    { question: "¿Cuántos años tiene un siglo?", options: ["50", "100", "1000", "10"], correct: 1 },
    { question: "¿Cuántos signos del zodiaco hay?", options: ["10", "12", "14", "8"], correct: 1 },
    { question: "¿Qué animal representa a España?", options: ["Águila", "Toro", "León", "Oso"], correct: 1 },
    { question: "¿Cuántas estrellas tiene la bandera de EEUU?", options: ["48", "50", "52", "51"], correct: 1 },
    { question: "¿Qué se celebra el 25 de diciembre?", options: ["Año Nuevo", "Navidad", "Pascua", "Halloween"], correct: 1 },
    { question: "¿En qué mes se celebra Halloween?", options: ["Septiembre", "Octubre", "Noviembre", "Diciembre"], correct: 1 },
    { question: "¿Qué moneda se usa en Japón?", options: ["Yuan", "Yen", "Won", "Dólar"], correct: 1 },
    { question: "¿Qué moneda se usa en Reino Unido?", options: ["Euro", "Libra", "Dólar", "Franco"], correct: 1 },
    { question: "¿Cuántos lados tiene un hexágono?", options: ["5", "6", "7", "8"], correct: 1 },
    { question: "¿Cuál es el número de emergencias en España?", options: ["911", "112", "999", "100"], correct: 1 },
    { question: "¿Cuál es la moneda de Estados Unidos?", options: ["Euro", "Dólar", "Peso", "Libra"], correct: 1 },
    { question: "¿Cuántas caras tiene un dado normal?", options: ["4", "6", "8", "12"], correct: 1 },
    { question: "¿Qué instrumento tiene teclas blancas y negras?", options: ["Guitarra", "Piano", "Violín", "Flauta"], correct: 1 },
    { question: "¿Cuántos ceros tiene un millón?", options: ["5", "6", "7", "8"], correct: 1 },
    { question: "¿Cuál es el símbolo del euro?", options: ["$", "€", "£", "¥"], correct: 1 },
    { question: "¿Cuántos gramos tiene un kilogramo?", options: ["100", "1000", "10000", "500"], correct: 1 },
    { question: "¿Cuántos centímetros tiene un metro?", options: ["10", "100", "1000", "50"], correct: 1 },
    { question: "¿Cuántos segundos tiene un minuto?", options: ["30", "60", "90", "100"], correct: 1 },
    { question: "¿Cuántos meses tiene un año?", options: ["10", "12", "11", "13"], correct: 1 },
    { question: "¿Cuántos días tiene una semana?", options: ["5", "7", "6", "8"], correct: 1 },
    { question: "¿Cuántas horas tiene un día?", options: ["12", "24", "20", "48"], correct: 1 },
    { question: "¿Cuántos lados tiene un triángulo?", options: ["2", "3", "4", "5"], correct: 1 },
    { question: "¿De qué color es la hierba?", options: ["Azul", "Verde", "Roja", "Amarilla"], correct: 1 },
    { question: "¿Cuántas patas tiene un perro?", options: ["2", "4", "6", "8"], correct: 1 },
    { question: "¿Qué animal dice 'miau'?", options: ["Perro", "Gato", "Vaca", "Pájaro"], correct: 1 }
];

function loadSpanishQuestions() {
    try {
        const questionsPath = path.join(__dirname, 'questions_espana.json');
        if (fs.existsSync(questionsPath)) {
            const data = fs.readFileSync(questionsPath, 'utf8');
            const questions = JSON.parse(data);
            return questions.map(q => {
                const allOptions = [...q.incorrect_answers, q.correct_answer];
                const shuffled = shuffleArray(allOptions);
                return {
                    question: q.question,
                    options: shuffled,
                    correct: shuffled.indexOf(q.correct_answer)
                };
            });
        }
        return [];
    } catch (error) {
        console.log('Error cargando archivo:', error.message);
        return [];
    }
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

async function initializeQuestions() {
    console.log('Inicializando preguntas...');
    spanishQuestions = loadSpanishQuestions();
    allQuestions = shuffleArray([...spanishQuestions, ...backupQuestions]);
    console.log('Total preguntas: ' + allQuestions.length);
}

async function refillQuestionsIfNeeded(minRequired) {
    if (allQuestions.length < minRequired) {
        console.log('Recargando preguntas...');
        allQuestions.push(...shuffleArray([...backupQuestions]));
        allQuestions.push(...shuffleArray([...spanishQuestions]));
        allQuestions = shuffleArray(allQuestions);
    }
}

function getRandomQuestions(count) {
    if (allQuestions.length < count) {
        allQuestions.push(...shuffleArray([...backupQuestions]));
    }
    const selected = allQuestions.splice(0, count);
    console.log('Enviadas ' + selected.length + ' preguntas. Quedan ' + allQuestions.length);
    return selected;
}

// SOCKET.IO
io.on('connection', (socket) => {
    console.log('Conectado:', socket.id);

    socket.on('createRoom', async (data) => {
        const playerName = data.playerName;
        const gameMode = data.gameMode || 'classic';
        const totalQuestions = data.totalQuestions || 10;
        
        console.log('Creando sala - Modo: ' + gameMode + ', Preguntas: ' + totalQuestions);
        
        const questionsNeeded = gameMode === 'classic' ? totalQuestions * 4 : totalQuestions;
        
        if (allQuestions.length < questionsNeeded + 50) {
            await refillQuestionsIfNeeded(questionsNeeded + 100);
        }
        
        const roomCode = generateRoomCode();
        rooms[roomCode] = {
            players: [{
                id: socket.id,
                name: playerName,
                ready: false,
                score: 0,
                lives: 3,
                answered: false
            }],
            gameMode: gameMode,
            totalQuestions: totalQuestions,
            currentQuestion: 0,
            currentPlayerIndex: 0,
            started: false,
            questions: getRandomQuestions(questionsNeeded)
        };
        
        socket.join(roomCode);
        socket.emit('roomCreated', { 
            roomCode: roomCode, 
            playerName: playerName,
            gameMode: gameMode,
            totalQuestions: totalQuestions
        });
        
        console.log('Sala ' + roomCode + ' creada');
    });

    socket.on('joinRoom', (data) => {
        const roomCode = data.roomCode.trim().toUpperCase();
        const playerName = data.playerName;
        const room = rooms[roomCode];
        
        if (!room) {
            socket.emit('roomError', 'Sala no encontrada');
            return;
        }
        if (room.players.length >= 4) {
            socket.emit('roomError', 'Sala llena');
            return;
        }
        if (room.started) {
            socket.emit('roomError', 'Partida ya iniciada');
            return;
        }
        
        room.players.push({
            id: socket.id,
            name: playerName,
            ready: false,
            score: 0,
            lives: 3,
            answered: false
        });
        
        socket.join(roomCode);
        io.to(roomCode).emit('playerJoined', {
            roomCode: roomCode,
            players: room.players,
            gameMode: room.gameMode,
            totalQuestions: room.totalQuestions
        });
    });

    socket.on('playerReady', (roomCode) => {
        const room = rooms[roomCode];
        if (!room) return;
        
        const player = room.players.find(p => p.id === socket.id);
        if (player) player.ready = true;
        
        io.to(roomCode).emit('playersUpdate', room.players);
        
        if (room.players.length >= 2 && room.players.every(p => p.ready) && !room.started) {
            room.started = true;
            console.log('Iniciando partida en ' + roomCode);
            sendQuestion(roomCode);
        }
    });

    socket.on('submitAnswer', (data) => {
        const roomCode = data.roomCode;
        const answerIndex = data.answerIndex;
        const timeLeft = data.timeLeft;
        
        const room = rooms[roomCode];
        if (!room) return;
        
        const player = room.players.find(p => p.id === socket.id);
        if (!player || player.answered) return;
        
        const question = room.questions[room.currentQuestion];
        if (!question) return;
        
        player.answered = true;
        const isCorrect = answerIndex === question.correct;
        
        if (room.gameMode === 'classic') {
            // MODO CLÁSICO
            if (room.players[room.currentPlayerIndex].id !== socket.id) return;
            
            if (isCorrect) {
                player.score += timeLeft * 10;
            }
            
            socket.emit('answerResult', {
                isCorrect: isCorrect,
                selectedIndex: answerIndex
            });
            
            setTimeout(() => {
                player.answered = false;
                room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
                
                if (room.currentPlayerIndex === 0) {
                    room.currentQuestion++;
                }
                
                if (room.currentQuestion >= room.totalQuestions) {
                    endGame(roomCode);
                } else {
                    sendQuestion(roomCode);
                }
            }, 2000);
            
        } else {
            // MODO SUPERVIVENCIA
            if (isCorrect) {
                player.score += 10;
            } else {
                player.lives--;
            }
            
            socket.emit('answerResult', {
                isCorrect: isCorrect,
                selectedIndex: answerIndex,
                lostLife: !isCorrect
            });
            
            const alivePlayers = room.players.filter(p => p.lives > 0);
            const allAnswered = alivePlayers.every(p => p.answered);
            
            if (allAnswered) {
                setTimeout(() => {
                    room.players.forEach(p => p.answered = false);
                    room.currentQuestion++;
                    
                    const stillAlive = room.players.filter(p => p.lives > 0);
                    
                    if (stillAlive.length <= 1 || room.currentQuestion >= room.totalQuestions) {
                        endGame(roomCode);
                    } else {
                        sendQuestion(roomCode);
                    }
                }, 2500);
            }
        }
    });

    socket.on('leaveRoom', (roomCode) => {
        leaveRoom(socket, roomCode);
    });

    socket.on('disconnect', () => {
        console.log('Desconectado:', socket.id);
        for (let roomCode in rooms) {
            leaveRoom(socket, roomCode);
        }
    });
});

function leaveRoom(socket, roomCode) {
    const room = rooms[roomCode];
    if (!room) return;
    
    const playerIndex = room.players.findIndex(p => p.id === socket.id);
    if (playerIndex === -1) return;
    
    room.players.splice(playerIndex, 1);
    
    if (room.players.length === 0) {
        delete rooms[roomCode];
    } else {
        if (room.currentPlayerIndex >= room.players.length) {
            room.currentPlayerIndex = 0;
        }
        io.to(roomCode).emit('playerLeft', room.players);
    }
}

function sendQuestion(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;
    
    const question = room.questions[room.currentQuestion];
    if (!question) {
        endGame(roomCode);
        return;
    }
    
    if (room.gameMode === 'classic') {
        const currentPlayer = room.players[room.currentPlayerIndex];
        
        io.to(currentPlayer.id).emit('newQuestion', {
            question: question.question,
            options: question.options,
            questionNumber: room.currentQuestion + 1,
            totalQuestions: room.totalQuestions,
            gameMode: 'classic',
            allPlayers: room.players.map(p => ({ name: p.name, score: p.score })),
            correctAnswer: question.correct
        });
        
        room.players.forEach((p, i) => {
            if (i !== room.currentPlayerIndex) {
                io.to(p.id).emit('waitingTurn', {
                    currentPlayerName: currentPlayer.name,
                    allPlayers: room.players.map(pl => ({ name: pl.name, score: pl.score }))
                });
            }
        });
    } else {
        const alivePlayers = room.players.filter(p => p.lives > 0);
        
        alivePlayers.forEach(p => {
            io.to(p.id).emit('newQuestion', {
                question: question.question,
                options: question.options,
                questionNumber: room.currentQuestion + 1,
                totalQuestions: room.totalQuestions,
                gameMode: 'survival',
                myLives: p.lives,
                allPlayers: room.players.map(pl => ({ name: pl.name, score: pl.score, lives: pl.lives })),
                correctAnswer: question.correct
            });
        });
    }
}

function endGame(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;
    
    let ranking;
    if (room.gameMode === 'survival') {
        ranking = [...room.players].sort((a, b) => {
            if (b.lives !== a.lives) return b.lives - a.lives;
            return b.score - a.score;
        });
    } else {
        ranking = [...room.players].sort((a, b) => b.score - a.score);
    }
    
    io.to(roomCode).emit('gameOver', {
        ranking: ranking.map(p => ({ name: p.name, score: p.score, lives: p.lives })),
        winner: ranking[0].name,
        gameMode: room.gameMode
    });
    
    delete rooms[roomCode];
}

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

(async () => {
    console.log('Iniciando Trivial Kapuchi...');
    await initializeQuestions();
    
    server.listen(PORT, () => {
        console.log('Servidor en puerto ' + PORT);
    });
})();
