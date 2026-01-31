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
app.get('/api/questions', async (req, res) => {
    const count = parseInt(req.query.count) || 10;
    
    // Asegurar que hay suficientes preguntas
    if (allQuestions.length < count) {
        await refillQuestionsIfNeeded(count);
    }
    
    const questions = getRandomQuestions(count);
    res.json(questions);
});

// Variables del servidor
const rooms = {};

// ===== SISTEMA DE PREGUNTAS CON MEZCLA ESPAÑOL + TRADUCIDAS =====
let allQuestions = [];
let spanishQuestions = []; // Preguntas en español nativo
let usedQuestions = []; // Tracking de preguntas ya usadas
const CACHE_SIZE = 500; // Aumentado para soportar más partidas simultáneas
const REFILL_THRESHOLD = 150; // Recargar cuando queden menos de 150

// ===== PREGUNTAS DE RESPALDO EMBEBIDAS (200 preguntas) =====
const backupQuestions = [
    // GEOGRAFÍA (40 preguntas)
    { question: "¿Cuál es la capital de Francia?", options: ["Londres", "París", "Berlín", "Madrid"], correct: 1, category: "Geografía" },
    { question: "¿Cuál es la capital de España?", options: ["Barcelona", "Madrid", "Sevilla", "Valencia"], correct: 1, category: "Geografía" },
    { question: "¿Cuál es la capital de Italia?", options: ["Milán", "Roma", "Nápoles", "Florencia"], correct: 1, category: "Geografía" },
    { question: "¿Cuál es la capital de Alemania?", options: ["Múnich", "Berlín", "Hamburgo", "Frankfurt"], correct: 1, category: "Geografía" },
    { question: "¿Cuál es la capital de Portugal?", options: ["Oporto", "Lisboa", "Faro", "Coímbra"], correct: 1, category: "Geografía" },
    { question: "¿Cuál es la capital de Reino Unido?", options: ["Manchester", "Londres", "Liverpool", "Birmingham"], correct: 1, category: "Geografía" },
    { question: "¿Cuál es la capital de Japón?", options: ["Osaka", "Tokio", "Kioto", "Hiroshima"], correct: 1, category: "Geografía" },
    { question: "¿Cuál es la capital de China?", options: ["Shanghái", "Pekín", "Hong Kong", "Cantón"], correct: 1, category: "Geografía" },
    { question: "¿Cuál es la capital de Brasil?", options: ["Río de Janeiro", "Brasilia", "São Paulo", "Salvador"], correct: 1, category: "Geografía" },
    { question: "¿Cuál es la capital de Argentina?", options: ["Córdoba", "Buenos Aires", "Rosario", "Mendoza"], correct: 1, category: "Geografía" },
    { question: "¿Cuál es la capital de México?", options: ["Guadalajara", "Ciudad de México", "Monterrey", "Cancún"], correct: 1, category: "Geografía" },
    { question: "¿Cuál es la capital de Estados Unidos?", options: ["Nueva York", "Washington D.C.", "Los Ángeles", "Chicago"], correct: 1, category: "Geografía" },
    { question: "¿Cuál es la capital de Canadá?", options: ["Toronto", "Ottawa", "Montreal", "Vancouver"], correct: 1, category: "Geografía" },
    { question: "¿Cuál es la capital de Australia?", options: ["Sídney", "Canberra", "Melbourne", "Brisbane"], correct: 1, category: "Geografía" },
    { question: "¿Cuál es el río más largo del mundo?", options: ["Amazonas", "Nilo", "Yangtsé", "Misisipi"], correct: 1, category: "Geografía" },
    { question: "¿Cuál es el océano más grande?", options: ["Atlántico", "Pacífico", "Índico", "Ártico"], correct: 1, category: "Geografía" },
    { question: "¿En qué continente está Egipto?", options: ["Asia", "África", "Europa", "Oceanía"], correct: 1, category: "Geografía" },
    { question: "¿Cuál es el país más grande del mundo?", options: ["China", "Rusia", "Canadá", "Estados Unidos"], correct: 1, category: "Geografía" },
    { question: "¿Cuál es la montaña más alta del mundo?", options: ["K2", "Everest", "Kilimanjaro", "Mont Blanc"], correct: 1, category: "Geografía" },
    { question: "¿En qué país está la Torre Eiffel?", options: ["Italia", "Francia", "España", "Alemania"], correct: 1, category: "Geografía" },
    { question: "¿En qué país está el Coliseo?", options: ["Grecia", "Italia", "España", "Turquía"], correct: 1, category: "Geografía" },
    { question: "¿En qué país está la Sagrada Familia?", options: ["Portugal", "España", "Italia", "Francia"], correct: 1, category: "Geografía" },
    { question: "¿Cuál es la capital de Rusia?", options: ["San Petersburgo", "Moscú", "Kiev", "Minsk"], correct: 1, category: "Geografía" },
    { question: "¿En qué océano está Hawái?", options: ["Atlántico", "Pacífico", "Índico", "Ártico"], correct: 1, category: "Geografía" },
    { question: "¿Cuál es el desierto más grande del mundo?", options: ["Gobi", "Sahara", "Kalahari", "Atacama"], correct: 1, category: "Geografía" },
    { question: "¿Cuántos continentes hay?", options: ["5", "7", "6", "8"], correct: 1, category: "Geografía" },
    { question: "¿En qué país está Machu Picchu?", options: ["Bolivia", "Perú", "Ecuador", "Colombia"], correct: 1, category: "Geografía" },
    { question: "¿Cuál es la capital de Grecia?", options: ["Tesalónica", "Atenas", "Creta", "Esparta"], correct: 1, category: "Geografía" },
    { question: "¿En qué país está la Gran Muralla?", options: ["Japón", "China", "Corea", "Mongolia"], correct: 1, category: "Geografía" },
    { question: "¿Cuál es el lago más grande del mundo?", options: ["Victoria", "Caspio", "Superior", "Baikal"], correct: 1, category: "Geografía" },
    { question: "¿En qué continente está la Antártida?", options: ["Es su propio continente", "América", "Oceanía", "No es continente"], correct: 0, category: "Geografía" },
    { question: "¿Cuál es la capital de Egipto?", options: ["Alejandría", "El Cairo", "Luxor", "Giza"], correct: 1, category: "Geografía" },
    { question: "¿En qué país está el Taj Mahal?", options: ["Pakistán", "India", "Bangladesh", "Nepal"], correct: 1, category: "Geografía" },
    { question: "¿Cuál es la capital de Turquía?", options: ["Estambul", "Ankara", "Izmir", "Antalya"], correct: 1, category: "Geografía" },
    { question: "¿En qué país están las Pirámides de Giza?", options: ["Sudán", "Egipto", "Libia", "Túnez"], correct: 1, category: "Geografía" },
    { question: "¿Cuál es el país más poblado del mundo?", options: ["India", "China", "Estados Unidos", "Indonesia"], correct: 0, category: "Geografía" },
    { question: "¿En qué país está Venecia?", options: ["Francia", "Italia", "Grecia", "Croacia"], correct: 1, category: "Geografía" },
    { question: "¿Cuál es la capital de Suiza?", options: ["Zúrich", "Berna", "Ginebra", "Basilea"], correct: 1, category: "Geografía" },
    { question: "¿En qué país está Ámsterdam?", options: ["Bélgica", "Países Bajos", "Alemania", "Dinamarca"], correct: 1, category: "Geografía" },
    { question: "¿Cuál es la capital de Austria?", options: ["Salzburgo", "Viena", "Innsbruck", "Graz"], correct: 1, category: "Geografía" },

    // CIENCIA (40 preguntas)
    { question: "¿Cuál es el planeta más grande del sistema solar?", options: ["Tierra", "Júpiter", "Saturno", "Neptuno"], correct: 1, category: "Ciencia" },
    { question: "¿Cuál es el planeta más cercano al Sol?", options: ["Venus", "Mercurio", "Marte", "Tierra"], correct: 1, category: "Ciencia" },
    { question: "¿Cuántos planetas hay en el sistema solar?", options: ["7", "8", "9", "10"], correct: 1, category: "Ciencia" },
    { question: "¿Qué gas respiramos principalmente?", options: ["Oxígeno", "Nitrógeno", "CO2", "Hidrógeno"], correct: 0, category: "Ciencia" },
    { question: "¿Cuál es el símbolo químico del oro?", options: ["Ag", "Au", "Fe", "Cu"], correct: 1, category: "Ciencia" },
    { question: "¿Cuál es el símbolo químico del agua?", options: ["O2", "H2O", "CO2", "NaCl"], correct: 1, category: "Ciencia" },
    { question: "¿Cuántos huesos tiene el cuerpo humano adulto?", options: ["196", "206", "216", "226"], correct: 1, category: "Ciencia" },
    { question: "¿Cuál es el órgano más grande del cuerpo?", options: ["Hígado", "Piel", "Cerebro", "Intestino"], correct: 1, category: "Ciencia" },
    { question: "¿A qué velocidad viaja la luz?", options: ["300.000 km/s", "150.000 km/s", "500.000 km/s", "1.000.000 km/s"], correct: 0, category: "Ciencia" },
    { question: "¿Qué científico descubrió la gravedad?", options: ["Einstein", "Newton", "Galileo", "Darwin"], correct: 1, category: "Ciencia" },
    { question: "¿Cuál es el metal más abundante en la Tierra?", options: ["Hierro", "Aluminio", "Cobre", "Oro"], correct: 1, category: "Ciencia" },
    { question: "¿Qué planeta tiene anillos?", options: ["Júpiter", "Saturno", "Urano", "Todos los anteriores"], correct: 3, category: "Ciencia" },
    { question: "¿Cuál es el animal más grande del mundo?", options: ["Elefante", "Ballena azul", "Jirafa", "Tiburón blanco"], correct: 1, category: "Ciencia" },
    { question: "¿Cuántas patas tiene una araña?", options: ["6", "8", "10", "12"], correct: 1, category: "Ciencia" },
    { question: "¿Qué tipo de animal es la ballena?", options: ["Pez", "Mamífero", "Reptil", "Anfibio"], correct: 1, category: "Ciencia" },
    { question: "¿Cuál es el punto de ebullición del agua?", options: ["90°C", "100°C", "110°C", "120°C"], correct: 1, category: "Ciencia" },
    { question: "¿Qué inventó Alexander Graham Bell?", options: ["Radio", "Teléfono", "Televisión", "Internet"], correct: 1, category: "Ciencia" },
    { question: "¿Quién inventó la bombilla?", options: ["Tesla", "Edison", "Bell", "Franklin"], correct: 1, category: "Ciencia" },
    { question: "¿Cuál es el elemento más abundante en el universo?", options: ["Oxígeno", "Hidrógeno", "Carbono", "Helio"], correct: 1, category: "Ciencia" },
    { question: "¿Qué es el ADN?", options: ["Proteína", "Ácido nucleico", "Vitamina", "Hormona"], correct: 1, category: "Ciencia" },
    { question: "¿Cuántos cromosomas tiene el ser humano?", options: ["23", "46", "48", "44"], correct: 1, category: "Ciencia" },
    { question: "¿Qué planeta es conocido como el planeta rojo?", options: ["Venus", "Marte", "Júpiter", "Mercurio"], correct: 1, category: "Ciencia" },
    { question: "¿Cuál es la fórmula del dióxido de carbono?", options: ["CO", "CO2", "C2O", "O2C"], correct: 1, category: "Ciencia" },
    { question: "¿Qué tipo de sangre es el donante universal?", options: ["A", "O negativo", "AB", "B"], correct: 1, category: "Ciencia" },
    { question: "¿Cuántos dientes tiene un adulto?", options: ["28", "32", "30", "34"], correct: 1, category: "Ciencia" },
    { question: "¿Qué vitamina proporciona el sol?", options: ["A", "D", "C", "B12"], correct: 1, category: "Ciencia" },
    { question: "¿Cuál es el hueso más largo del cuerpo?", options: ["Húmero", "Fémur", "Tibia", "Radio"], correct: 1, category: "Ciencia" },
    { question: "¿Qué animal puede regenerar sus extremidades?", options: ["Lagarto", "Salamandra", "Serpiente", "Rana"], correct: 1, category: "Ciencia" },
    { question: "¿Cuál es la estrella más cercana a la Tierra?", options: ["Alfa Centauri", "Sol", "Sirio", "Betelgeuse"], correct: 1, category: "Ciencia" },
    { question: "¿Qué gas produce el efecto invernadero?", options: ["Oxígeno", "CO2", "Nitrógeno", "Helio"], correct: 1, category: "Ciencia" },
    { question: "¿Cuántos litros de sangre tiene el cuerpo humano?", options: ["3", "5", "7", "10"], correct: 1, category: "Ciencia" },
    { question: "¿Qué es la fotosíntesis?", options: ["Respiración", "Producción de alimento por plantas", "Digestión", "Reproducción"], correct: 1, category: "Ciencia" },
    { question: "¿Cuál es el símbolo químico de la plata?", options: ["Au", "Ag", "Pt", "Pb"], correct: 1, category: "Ciencia" },
    { question: "¿Qué planeta tiene la Gran Mancha Roja?", options: ["Marte", "Júpiter", "Saturno", "Venus"], correct: 1, category: "Ciencia" },
    { question: "¿Cuál es el metal líquido a temperatura ambiente?", options: ["Plomo", "Mercurio", "Estaño", "Zinc"], correct: 1, category: "Ciencia" },
    { question: "¿Qué estudia la botánica?", options: ["Animales", "Plantas", "Rocas", "Estrellas"], correct: 1, category: "Ciencia" },
    { question: "¿Cuál es la unidad de medida de la corriente eléctrica?", options: ["Voltio", "Amperio", "Ohmio", "Vatio"], correct: 1, category: "Ciencia" },
    { question: "¿Qué científico propuso la teoría de la relatividad?", options: ["Newton", "Einstein", "Hawking", "Bohr"], correct: 1, category: "Ciencia" },
    { question: "¿Cuántos elementos tiene la tabla periódica actual?", options: ["108", "118", "128", "98"], correct: 1, category: "Ciencia" },
    { question: "¿Qué órgano bombea la sangre?", options: ["Pulmón", "Corazón", "Hígado", "Riñón"], correct: 1, category: "Ciencia" },

    // HISTORIA (40 preguntas)
    { question: "¿En qué año llegó Colón a América?", options: ["1482", "1492", "1502", "1512"], correct: 1, category: "Historia" },
    { question: "¿En qué año comenzó la Segunda Guerra Mundial?", options: ["1935", "1939", "1941", "1945"], correct: 1, category: "Historia" },
    { question: "¿En qué año terminó la Segunda Guerra Mundial?", options: ["1943", "1945", "1947", "1950"], correct: 1, category: "Historia" },
    { question: "¿Quién fue el primer presidente de Estados Unidos?", options: ["Lincoln", "Washington", "Jefferson", "Adams"], correct: 1, category: "Historia" },
    { question: "¿En qué año cayó el Muro de Berlín?", options: ["1987", "1989", "1991", "1993"], correct: 1, category: "Historia" },
    { question: "¿Quién pintó la Mona Lisa?", options: ["Miguel Ángel", "Leonardo da Vinci", "Rafael", "Botticelli"], correct: 1, category: "Historia" },
    { question: "¿En qué año llegó el hombre a la Luna?", options: ["1967", "1969", "1971", "1973"], correct: 1, category: "Historia" },
    { question: "¿Quién escribió Don Quijote?", options: ["Lope de Vega", "Cervantes", "Quevedo", "Calderón"], correct: 1, category: "Historia" },
    { question: "¿Qué imperio construyó las pirámides de Egipto?", options: ["Romano", "Egipcio", "Griego", "Persa"], correct: 1, category: "Historia" },
    { question: "¿Quién fue Cleopatra?", options: ["Emperatriz romana", "Reina de Egipto", "Diosa griega", "Faraona"], correct: 1, category: "Historia" },
    { question: "¿En qué siglo fue la Revolución Francesa?", options: ["XVII", "XVIII", "XIX", "XX"], correct: 1, category: "Historia" },
    { question: "¿Quién fue Napoleón Bonaparte?", options: ["Rey de Francia", "Emperador francés", "Presidente francés", "Duque"], correct: 1, category: "Historia" },
    { question: "¿Qué civilización inventó la democracia?", options: ["Romana", "Griega", "Egipcia", "Persa"], correct: 1, category: "Historia" },
    { question: "¿En qué año se hundió el Titanic?", options: ["1910", "1912", "1914", "1916"], correct: 1, category: "Historia" },
    { question: "¿Quién descubrió América?", options: ["Vasco da Gama", "Cristóbal Colón", "Magallanes", "Américo Vespucio"], correct: 1, category: "Historia" },
    { question: "¿En qué año comenzó la Primera Guerra Mundial?", options: ["1912", "1914", "1916", "1918"], correct: 1, category: "Historia" },
    { question: "¿Quién fue Julio César?", options: ["Emperador romano", "Dictador romano", "Rey romano", "Senador"], correct: 1, category: "Historia" },
    { question: "¿Qué país lanzó la primera bomba atómica?", options: ["Alemania", "Estados Unidos", "Rusia", "Japón"], correct: 1, category: "Historia" },
    { question: "¿En qué ciudad cayeron las bombas atómicas?", options: ["Tokio y Osaka", "Hiroshima y Nagasaki", "Kioto y Kobe", "Yokohama y Sapporo"], correct: 1, category: "Historia" },
    { question: "¿Quién fue Martin Luther King?", options: ["Presidente", "Activista derechos civiles", "Científico", "Escritor"], correct: 1, category: "Historia" },
    { question: "¿En qué año se firmó la Constitución de Estados Unidos?", options: ["1776", "1787", "1791", "1800"], correct: 1, category: "Historia" },
    { question: "¿Qué evento marcó el inicio de la Edad Media?", options: ["Caída de Roma", "Descubrimiento de América", "Revolución Francesa", "Guerra de Troya"], correct: 0, category: "Historia" },
    { question: "¿Quién fue el primer emperador romano?", options: ["Julio César", "Augusto", "Nerón", "Calígula"], correct: 1, category: "Historia" },
    { question: "¿En qué siglo vivió Shakespeare?", options: ["XV", "XVI-XVII", "XVIII", "XIV"], correct: 1, category: "Historia" },
    { question: "¿Qué país inició la Revolución Industrial?", options: ["Francia", "Inglaterra", "Alemania", "Estados Unidos"], correct: 1, category: "Historia" },
    { question: "¿Quién fue Mahatma Gandhi?", options: ["Emperador indio", "Líder independentista indio", "Presidente de Pakistán", "Rey de Nepal"], correct: 1, category: "Historia" },
    { question: "¿En qué año se independizó México?", options: ["1810", "1821", "1824", "1836"], correct: 1, category: "Historia" },
    { question: "¿Quién fue Simón Bolívar?", options: ["Conquistador español", "Libertador de América", "Rey de España", "Virrey"], correct: 1, category: "Historia" },
    { question: "¿Qué imperio dominó gran parte de América del Sur?", options: ["Azteca", "Inca", "Maya", "Olmeca"], correct: 1, category: "Historia" },
    { question: "¿En qué año terminó la Guerra Civil Española?", options: ["1936", "1939", "1942", "1945"], correct: 1, category: "Historia" },
    { question: "¿Quién fue Francisco Franco?", options: ["Rey de España", "Dictador de España", "Presidente de España", "Príncipe"], correct: 1, category: "Historia" },
    { question: "¿En qué año murió Franco?", options: ["1970", "1975", "1980", "1985"], correct: 1, category: "Historia" },
    { question: "¿Quién fue el último faraón de Egipto?", options: ["Tutankamón", "Cleopatra", "Ramsés II", "Nefertiti"], correct: 1, category: "Historia" },
    { question: "¿Qué civilización construyó Machu Picchu?", options: ["Azteca", "Inca", "Maya", "Olmeca"], correct: 1, category: "Historia" },
    { question: "¿En qué año se fundó Roma según la leyenda?", options: ["653 a.C.", "753 a.C.", "853 a.C.", "553 a.C."], correct: 1, category: "Historia" },
    { question: "¿Quién inventó la imprenta?", options: ["Da Vinci", "Gutenberg", "Galileo", "Newton"], correct: 1, category: "Historia" },
    { question: "¿En qué siglo se inventó la imprenta?", options: ["XIV", "XV", "XVI", "XIII"], correct: 1, category: "Historia" },
    { question: "¿Qué guerra enfrentó al Norte y Sur de Estados Unidos?", options: ["Independencia", "Civil", "Vietnam", "Corea"], correct: 1, category: "Historia" },
    { question: "¿Quién fue Abraham Lincoln?", options: ["Primer presidente", "Presidente durante Guerra Civil", "Último presidente", "Fundador del país"], correct: 1, category: "Historia" },
    { question: "¿En qué año terminó la Guerra Fría?", options: ["1985", "1989", "1991", "1995"], correct: 2, category: "Historia" },

    // ENTRETENIMIENTO (40 preguntas)
    { question: "¿Quién interpretó a Jack en Titanic?", options: ["Brad Pitt", "Leonardo DiCaprio", "Tom Cruise", "Johnny Depp"], correct: 1, category: "Entretenimiento" },
    { question: "¿En qué año se estrenó el primer Harry Potter?", options: ["1999", "2001", "2003", "2005"], correct: 1, category: "Entretenimiento" },
    { question: "¿Cómo se llama el protagonista de Mario Bros?", options: ["Luigi", "Mario", "Wario", "Toad"], correct: 1, category: "Entretenimiento" },
    { question: "¿Qué banda cantó 'Bohemian Rhapsody'?", options: ["The Beatles", "Queen", "Led Zeppelin", "Pink Floyd"], correct: 1, category: "Entretenimiento" },
    { question: "¿Quién es el creador de Mickey Mouse?", options: ["Pixar", "Walt Disney", "Warner Bros", "DreamWorks"], correct: 1, category: "Entretenimiento" },
    { question: "¿En qué película aparece Darth Vader?", options: ["Star Trek", "Star Wars", "Alien", "Blade Runner"], correct: 1, category: "Entretenimiento" },
    { question: "¿Cuántos jugadores hay en un equipo de fútbol?", options: ["9", "11", "10", "12"], correct: 1, category: "Entretenimiento" },
    { question: "¿En qué deporte se usa una raqueta y pelota amarilla?", options: ["Badminton", "Tenis", "Squash", "Ping Pong"], correct: 1, category: "Entretenimiento" },
    { question: "¿Quién escribió 'Romeo y Julieta'?", options: ["Dickens", "Shakespeare", "Cervantes", "Dante"], correct: 1, category: "Entretenimiento" },
    { question: "¿De qué país es el grupo ABBA?", options: ["Noruega", "Suecia", "Finlandia", "Dinamarca"], correct: 1, category: "Entretenimiento" },
    { question: "¿Cómo se llama el mundo de Minecraft?", options: ["Overworld", "Nether", "The End", "Todos"], correct: 0, category: "Entretenimiento" },
    { question: "¿Qué superhéroe es de Krypton?", options: ["Batman", "Superman", "Spiderman", "Flash"], correct: 1, category: "Entretenimiento" },
    { question: "¿Quién es el archienemigo de Batman?", options: ["Lex Luthor", "Joker", "Thanos", "Magneto"], correct: 1, category: "Entretenimiento" },
    { question: "¿En qué saga aparece Frodo?", options: ["Harry Potter", "El Señor de los Anillos", "Narnia", "Eragon"], correct: 1, category: "Entretenimiento" },
    { question: "¿Quién canta 'Thriller'?", options: ["Prince", "Michael Jackson", "Stevie Wonder", "James Brown"], correct: 1, category: "Entretenimiento" },
    { question: "¿De qué país es el anime?", options: ["China", "Japón", "Corea", "Tailandia"], correct: 1, category: "Entretenimiento" },
    { question: "¿Cómo se llama el protagonista de Zelda?", options: ["Zelda", "Link", "Ganondorf", "Epona"], correct: 1, category: "Entretenimiento" },
    { question: "¿Qué red social tiene el logo de un pájaro?", options: ["Facebook", "Twitter/X", "Instagram", "TikTok"], correct: 1, category: "Entretenimiento" },
    { question: "¿En qué año se fundó YouTube?", options: ["2003", "2005", "2007", "2009"], correct: 1, category: "Entretenimiento" },
    { question: "¿Quién es el creador de Facebook?", options: ["Bill Gates", "Mark Zuckerberg", "Steve Jobs", "Elon Musk"], correct: 1, category: "Entretenimiento" },
    { question: "¿Qué significa FIFA?", options: ["Federación de Fútbol", "Federación Internacional de Fútbol Asociación", "Fútbol Internacional", "Federation Football"], correct: 1, category: "Entretenimiento" },
    { question: "¿Cuántos Grand Slams hay en tenis?", options: ["3", "4", "5", "6"], correct: 1, category: "Entretenimiento" },
    { question: "¿En qué país se inventó el ajedrez?", options: ["China", "India", "Persia", "Grecia"], correct: 1, category: "Entretenimiento" },
    { question: "¿Cuántas casillas tiene un tablero de ajedrez?", options: ["36", "64", "81", "100"], correct: 1, category: "Entretenimiento" },
    { question: "¿Qué banda cantó 'Smells Like Teen Spirit'?", options: ["Pearl Jam", "Nirvana", "Soundgarden", "Alice in Chains"], correct: 1, category: "Entretenimiento" },
    { question: "¿Quién es el vocalista de U2?", options: ["Sting", "Bono", "Chris Martin", "Mick Jagger"], correct: 1, category: "Entretenimiento" },
    { question: "¿En qué película aparece 'I'll be back'?", options: ["Rambo", "Terminator", "Robocop", "Predator"], correct: 1, category: "Entretenimiento" },
    { question: "¿Quién dirigió Titanic?", options: ["Spielberg", "James Cameron", "Scorsese", "Tarantino"], correct: 1, category: "Entretenimiento" },
    { question: "¿Qué película ganó más Oscars?", options: ["Titanic", "El Señor de los Anillos: El Retorno del Rey", "Ben-Hur", "Todas empatadas con 11"], correct: 3, category: "Entretenimiento" },
    { question: "¿En qué año se estrenó el primer Toy Story?", options: ["1993", "1995", "1997", "1999"], correct: 1, category: "Entretenimiento" },
    { question: "¿Qué compañía creó el PlayStation?", options: ["Nintendo", "Sony", "Microsoft", "Sega"], correct: 1, category: "Entretenimiento" },
    { question: "¿En qué año salió el primer iPhone?", options: ["2005", "2007", "2009", "2010"], correct: 1, category: "Entretenimiento" },
    { question: "¿Quién es el personaje principal de GTA V?", options: ["Niko", "Michael, Franklin y Trevor", "CJ", "Tommy"], correct: 1, category: "Entretenimiento" },
    { question: "¿Cuántos libros hay de Harry Potter?", options: ["5", "7", "8", "6"], correct: 1, category: "Entretenimiento" },
    { question: "¿Quién escribió Harry Potter?", options: ["Stephen King", "J.K. Rowling", "Tolkien", "C.S. Lewis"], correct: 1, category: "Entretenimiento" },
    { question: "¿En qué casa de Hogwarts está Harry?", options: ["Slytherin", "Gryffindor", "Ravenclaw", "Hufflepuff"], correct: 1, category: "Entretenimiento" },
    { question: "¿Cómo se llama el elfo doméstico de Harry Potter?", options: ["Kreacher", "Dobby", "Winky", "Hokey"], correct: 1, category: "Entretenimiento" },
    { question: "¿Qué superhéroe es Peter Parker?", options: ["Batman", "Spiderman", "Superman", "Iron Man"], correct: 1, category: "Entretenimiento" },
    { question: "¿Quién es Tony Stark?", options: ["Capitán América", "Iron Man", "Thor", "Hulk"], correct: 1, category: "Entretenimiento" },
    { question: "¿Cuál es el verdadero nombre de Batman?", options: ["Clark Kent", "Bruce Wayne", "Peter Parker", "Tony Stark"], correct: 1, category: "Entretenimiento" },

    // CULTURA GENERAL (40 preguntas)
    { question: "¿Cuántos días tiene un año bisiesto?", options: ["365", "366", "364", "367"], correct: 1, category: "Cultura General" },
    { question: "¿Cuántos minutos tiene una hora?", options: ["30", "60", "90", "120"], correct: 1, category: "Cultura General" },
    { question: "¿Cuántos segundos tiene un minuto?", options: ["30", "60", "90", "100"], correct: 1, category: "Cultura General" },
    { question: "¿Cuál es el color del semáforo para parar?", options: ["Verde", "Rojo", "Amarillo", "Azul"], correct: 1, category: "Cultura General" },
    { question: "¿Cuántos colores tiene el arcoíris?", options: ["5", "7", "6", "8"], correct: 1, category: "Cultura General" },
    { question: "¿Qué significa WWW?", options: ["World Wide Web", "World Web Wide", "Wide World Web", "Web World Wide"], correct: 0, category: "Cultura General" },
    { question: "¿Cuántas letras tiene el abecedario español?", options: ["26", "27", "28", "29"], correct: 1, category: "Cultura General" },
    { question: "¿Cuál es el idioma más hablado del mundo?", options: ["Español", "Chino mandarín", "Inglés", "Hindi"], correct: 1, category: "Cultura General" },
    { question: "¿Cuántos años tiene un siglo?", options: ["50", "100", "1000", "10"], correct: 1, category: "Cultura General" },
    { question: "¿Cuántos años tiene un milenio?", options: ["100", "1000", "10000", "500"], correct: 1, category: "Cultura General" },
    { question: "¿En qué mano se lleva el anillo de bodas?", options: ["Derecha", "Izquierda (depende del país)", "Ambas", "Ninguna"], correct: 1, category: "Cultura General" },
    { question: "¿Cuántos signos del zodiaco hay?", options: ["10", "12", "14", "8"], correct: 1, category: "Cultura General" },
    { question: "¿Qué animal representa a España?", options: ["Águila", "Toro", "León", "Oso"], correct: 1, category: "Cultura General" },
    { question: "¿De qué color es la bandera de Japón?", options: ["Azul y blanca", "Roja y blanca", "Verde y blanca", "Negra y roja"], correct: 1, category: "Cultura General" },
    { question: "¿Cuántas estrellas tiene la bandera de Estados Unidos?", options: ["48", "50", "52", "51"], correct: 1, category: "Cultura General" },
    { question: "¿Qué se celebra el 25 de diciembre?", options: ["Año Nuevo", "Navidad", "Pascua", "Halloween"], correct: 1, category: "Cultura General" },
    { question: "¿En qué mes se celebra Halloween?", options: ["Septiembre", "Octubre", "Noviembre", "Diciembre"], correct: 1, category: "Cultura General" },
    { question: "¿Qué moneda se usa en Japón?", options: ["Yuan", "Yen", "Won", "Dólar"], correct: 1, category: "Cultura General" },
    { question: "¿Qué moneda se usa en Reino Unido?", options: ["Euro", "Libra", "Dólar", "Franco"], correct: 1, category: "Cultura General" },
    { question: "¿Cuántos lados tiene un hexágono?", options: ["5", "6", "7", "8"], correct: 1, category: "Cultura General" },
    { question: "¿Cuántos lados tiene un pentágono?", options: ["4", "5", "6", "7"], correct: 1, category: "Cultura General" },
    { question: "¿Qué significa la 'E' en E=mc²?", options: ["Electricidad", "Energía", "Electrón", "Elemento"], correct: 1, category: "Cultura General" },
    { question: "¿Cuál es el número de emergencias en España?", options: ["911", "112", "999", "100"], correct: 1, category: "Cultura General" },
    { question: "¿Cuántos continentes hay en la Tierra?", options: ["5", "7", "6", "8"], correct: 1, category: "Cultura General" },
    { question: "¿Qué día se celebra San Valentín?", options: ["14 de enero", "14 de febrero", "14 de marzo", "14 de abril"], correct: 1, category: "Cultura General" },
    { question: "¿Cuál es la moneda de Estados Unidos?", options: ["Euro", "Dólar", "Peso", "Libra"], correct: 1, category: "Cultura General" },
    { question: "¿Cuántas caras tiene un dado normal?", options: ["4", "6", "8", "12"], correct: 1, category: "Cultura General" },
    { question: "¿Qué instrumento tiene teclas blancas y negras?", options: ["Guitarra", "Piano", "Violín", "Flauta"], correct: 1, category: "Cultura General" },
    { question: "¿Cuál es el metal más caro del mundo?", options: ["Oro", "Platino", "Rodio", "Plata"], correct: 2, category: "Cultura General" },
    { question: "¿Qué significa GPS?", options: ["Global Position System", "Global Positioning System", "General Position Service", "Geographic Position System"], correct: 1, category: "Cultura General" },
    { question: "¿Cuántos ceros tiene un millón?", options: ["5", "6", "7", "8"], correct: 1, category: "Cultura General" },
    { question: "¿Cuál es el símbolo del euro?", options: ["$", "€", "£", "¥"], correct: 1, category: "Cultura General" },
    { question: "¿En qué año se creó el euro?", options: ["1995", "1999", "2002", "2005"], correct: 1, category: "Cultura General" },
    { question: "¿Cuántos gramos tiene un kilogramo?", options: ["100", "1000", "10000", "500"], correct: 1, category: "Cultura General" },
    { question: "¿Cuántos centímetros tiene un metro?", options: ["10", "100", "1000", "50"], correct: 1, category: "Cultura General" },
    { question: "¿Qué significa ONU?", options: ["Organización de Naciones Unidas", "Orden Nacional Universal", "Oficina de Naciones Unidas", "Organismo Neutro Universal"], correct: 0, category: "Cultura General" },
    { question: "¿Cuál es el código telefónico de España?", options: ["+33", "+34", "+35", "+32"], correct: 1, category: "Cultura General" },
    { question: "¿Qué nota musical va después de Do?", options: ["Mi", "Re", "Fa", "Sol"], correct: 1, category: "Cultura General" },
    { question: "¿Cuántas notas musicales hay?", options: ["5", "7", "8", "6"], correct: 1, category: "Cultura General" },
    { question: "¿Qué se mide en grados Celsius?", options: ["Peso", "Temperatura", "Distancia", "Presión"], correct: 1, category: "Cultura General" }
];

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
            console.log('⚠️ Archivo questions_espana.json no encontrado');
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
        console.log('⚠️ No se encontró questions.json, usando preguntas de respaldo embebidas');
        return backupQuestions;
    }
}

// Inicializar preguntas al arrancar
async function initializeQuestions() {
    console.log('🔄 Inicializando sistema con preguntas (ESPAÑOL + Traducidas + Respaldo)...');
    console.log('⏳ Esto tomará ~30-40 segundos...');
    
    // Cargar preguntas en español del archivo
    spanishQuestions = loadSpanishQuestions();
    
    // Usar TODAS las preguntas españolas disponibles
    const spanishCount = spanishQuestions.length;
    const apiCount = 200; // APIs adicionales para variedad
    
    console.log(`📚 Usando ${spanishCount} preguntas en ESPAÑOL NATIVO`);
    console.log(`🌐 Descargando ${apiCount} preguntas FÁCILES traducidas adicionales...`);
    
    // Tomar TODAS las preguntas españolas
    const selectedSpanish = shuffleArray([...spanishQuestions]);
    
    // Descargar preguntas de APIs (fáciles)
    const allFetched = [];
    const batches = Math.ceil(apiCount / 50);
    for (let i = 0; i < batches; i++) {
        console.log(`📥 Descargando lote ${i + 1}/${batches} de APIs...`);
        const batch = await fetchQuestionsFromAPI(50);
        if (batch.length > 0) {
            allFetched.push(...batch);
        }
        // Pequeña pausa entre lotes
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // AÑADIR PREGUNTAS DE RESPALDO EMBEBIDAS
    const backupShuffled = shuffleArray([...backupQuestions]);
    console.log(`📦 Añadiendo ${backupShuffled.length} preguntas de respaldo embebidas`);
    
    // MEZCLAR TODAS las fuentes
    const mixedQuestions = [...selectedSpanish, ...allFetched.slice(0, apiCount), ...backupShuffled];
    
    if (mixedQuestions.length > 0) {
        // Hacer shuffle UNA VEZ al cargar
        allQuestions = shuffleArray(mixedQuestions);
        console.log(`✅ Sistema listo con ${allQuestions.length} preguntas totales`);
        console.log(`   🇪🇸 ${spanishCount} en español nativo`);
        console.log(`   🌐 ${allFetched.length} traducidas de APIs`);
        console.log(`   📦 ${backupShuffled.length} de respaldo embebidas`);
        console.log(`🎮 ¡Máxima variedad con preguntas españolas + APIs + Respaldo!`);
    } else {
        // Usar preguntas de respaldo como último recurso
        allQuestions = shuffleArray([...backupQuestions]);
        console.log(`📁 Sistema usando ${allQuestions.length} preguntas de respaldo`);
    }
}

// Recargar preguntas automáticamente cuando se agoten
async function refillQuestionsIfNeeded(minRequired = REFILL_THRESHOLD) {
    if (allQuestions.length < minRequired) {
        console.log(`🔄 Recargando preguntas (quedan ${allQuestions.length}, necesitamos ${minRequired})...`);
        
        // Primero añadir preguntas de respaldo (instantáneo)
        const backupToAdd = shuffleArray([...backupQuestions]).filter(bq => 
            !allQuestions.some(aq => aq.question === bq.question)
        );
        
        if (backupToAdd.length > 0) {
            allQuestions.push(...backupToAdd);
            console.log(`📦 Añadidas ${backupToAdd.length} preguntas de respaldo. Total: ${allQuestions.length}`);
        }
        
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
    // Verificar si hay suficientes preguntas
    if (allQuestions.length < count) {
        console.log(`⚠️ No hay suficientes preguntas (${allQuestions.length}/${count}), usando respaldo...`);
        // Añadir preguntas de respaldo inmediatamente
        const backupToAdd = shuffleArray([...backupQuestions]);
        allQuestions.push(...backupToAdd);
        console.log(`📦 Añadidas ${backupToAdd.length} preguntas de respaldo. Total: ${allQuestions.length}`);
    }
    
    // Tomar las primeras 'count' preguntas del array
    const selected = allQuestions.splice(0, count);
    
    console.log(`📤 Enviadas ${selected.length} preguntas. Quedan ${allQuestions.length} en el pool`);
    
    // Recargar en segundo plano si es necesario
    if (allQuestions.length < REFILL_THRESHOLD) {
        refillQuestionsIfNeeded().catch(err => console.log('Error recargando:', err));
    }
    
    return selected;
}

// Socket.IO eventos
io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    socket.on('createRoom', async (data) => {
        const playerName = typeof data === 'string' ? data : data.playerName;
        const mode = (typeof data === 'object' && data.mode) ? data.mode : 'normal';
        const totalRounds = (typeof data === 'object' && data.totalRounds) ? data.totalRounds : 1;
        const questionsPerRound = (typeof data === 'object' && data.questionsPerRound) ? data.questionsPerRound : 15;
        const maxPlayers = 4; // Máximo 4 jugadores
        const totalQuestions = questionsPerRound * maxPlayers * totalRounds; // Preguntas para todas las rondas
        
        // Asegurar que hay suficientes preguntas ANTES de crear la sala
        console.log(`🎮 Creando sala: ${totalQuestions} preguntas necesarias (${questionsPerRound} x ${maxPlayers} jugadores x ${totalRounds} rondas)`);
        
        if (allQuestions.length < totalQuestions) {
            console.log(`⚠️ Pool insuficiente (${allQuestions.length}), recargando...`);
            await refillQuestionsIfNeeded(totalQuestions + 50); // +50 de margen
        }
        
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
        
        console.log(`✅ Sala ${roomCode} creada con ${rooms[roomCode].questions.length} preguntas`);
        
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
            console.log(`🎮 Partida iniciada en sala ${roomCode} con ${room.players.length} jugadores`);
            sendQuestion(roomCode);
        }
    });

    socket.on('submitAnswer', ({roomCode, answerIndex, timeLeft}) => {
        const room = rooms[roomCode];
        if (!room) return;
        
        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;
        
        // Verificar que sea el turno de este jugador
        if (room.players[room.currentPlayerIndex].id !== socket.id) {
            console.log(`⚠️ Jugador ${player.name} intentó responder fuera de turno`);
            return;
        }
        
        // Marcar que este jugador ya respondió
        player.hasAnswered = true;
        player.questionsAnswered++;
        
        const question = room.questions[room.currentQuestion];
        
        // Verificar que la pregunta existe
        if (!question) {
            console.log(`❌ Error: Pregunta ${room.currentQuestion} no existe`);
            socket.emit('roomError', 'Error interno del juego');
            return;
        }
        
        const isCorrect = answerIndex === question.correct;
        
        if (isCorrect) {
            player.score += timeLeft * 10;
        }
        
        console.log(`📝 ${player.name} respondió: ${isCorrect ? '✅' : '❌'} (Pregunta ${room.currentQuestion + 1})`);
        
        socket.emit('answerResult', {
            isCorrect,
            correctAnswer: question.correct
        });
        
        // Verificar si todos terminaron esta ronda
        const questionsThisRound = room.questionsPerRound * room.currentRound;
        if (room.players.every(p => p.questionsAnswered >= questionsThisRound)) {
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
                    console.log(`🔄 Fin de ronda ${room.currentRound}/${room.totalRounds} en sala ${roomCode}`);
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
                    console.log(`🏆 Partida terminada en sala ${roomCode}. Ganador: ${ranking[0].name}`);
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
            
            console.log(`⏰ Tiempo agotado para ${currentPlayer.name}`);
            
            // Verificar si todos terminaron esta ronda
            const questionsThisRound = room.questionsPerRound * room.currentRound;
            if (room.players.every(p => p.questionsAnswered >= questionsThisRound)) {
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
        
        // Verificar que hay más preguntas
        if (room.currentQuestion >= room.questions.length) {
            console.log(`❌ Error: Se acabaron las preguntas en sala ${roomCode}`);
            // Añadir preguntas de emergencia
            const emergencyQuestions = shuffleArray([...backupQuestions]).slice(0, 50);
            room.questions.push(...emergencyQuestions);
            console.log(`📦 Añadidas ${emergencyQuestions.length} preguntas de emergencia`);
        }
        
        // Resetear estado del siguiente jugador
        room.players[room.currentPlayerIndex].hasAnswered = false;
        
        // Enviar siguiente pregunta
        sendQuestion(roomCode);
    }

    socket.on('disconnect', () => {
        console.log('Usuario desconectado:', socket.id);
        for (let roomCode in rooms) {
            const room = rooms[roomCode];
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            
            if (playerIndex !== -1) {
                const playerName = room.players[playerIndex].name;
                room.players = room.players.filter(p => p.id !== socket.id);
                console.log(`👋 ${playerName} salió de sala ${roomCode}`);
                
                if (room.players.length === 0) {
                    delete rooms[roomCode];
                    console.log(`🗑️ Sala ${roomCode} eliminada (vacía)`);
                } else {
                    // Ajustar índice del jugador actual si es necesario
                    if (room.currentPlayerIndex >= room.players.length) {
                        room.currentPlayerIndex = 0;
                    }
                    io.to(roomCode).emit('playerLeft', room.players);
                }
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
    if (!room) {
        console.log(`❌ Error: Sala ${roomCode} no existe`);
        return;
    }
    
    const question = room.questions[room.currentQuestion];
    if (!question) {
        console.log(`❌ Error: Pregunta ${room.currentQuestion} no existe en sala ${roomCode}`);
        return;
    }
    
    const currentPlayer = room.players[room.currentPlayerIndex];
    if (!currentPlayer) {
        console.log(`❌ Error: Jugador ${room.currentPlayerIndex} no existe en sala ${roomCode}`);
        return;
    }
    
    console.log(`📤 Pregunta ${room.currentQuestion + 1} para ${currentPlayer.name} en sala ${roomCode}`);
    
    // Enviar pregunta solo al jugador actual
    io.to(currentPlayer.id).emit('newQuestion', {
        question: question.question,
        options: question.options,
        questionNumber: currentPlayer.questionsAnswered + 1,
        totalQuestions: room.questionsPerRound,
        currentRound: room.currentRound,
        totalRounds: room.totalRounds,
        allPlayers: room.players, // Para marcador en vivo
        correctAnswer: question.correct // Para comodín 50/50
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
