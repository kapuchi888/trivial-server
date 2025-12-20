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
const allQuestions = [
    { question: "¿Cuál es la capital de Francia?", options: ["Londres", "Berlín", "París", "Madrid"], correct: 2 },
    { question: "¿Cuál es el planeta más grande del sistema solar?", options: ["Tierra", "Marte", "Júpiter", "Saturno"], correct: 2 },
    { question: "¿En qué año llegó el hombre a la Luna?", options: ["1965", "1969", "1972", "1975"], correct: 1 },
    { question: "¿Cuál es el océano más grande?", options: ["Atlántico", "Índico", "Ártico", "Pacífico"], correct: 3 },
    { question: "¿Quién pintó la Mona Lisa?", options: ["Van Gogh", "Da Vinci", "Picasso", "Miguel Ángel"], correct: 1 },
    { question: "¿Cuántos continentes hay?", options: ["5", "6", "7", "8"], correct: 2 },
    { question: "¿Cuál es el animal terrestre más rápido?", options: ["León", "Guepardo", "Tigre", "Caballo"], correct: 1 },
    { question: "¿En qué país se encuentra la Torre Eiffel?", options: ["Italia", "España", "Francia", "Alemania"], correct: 2 },
    { question: "¿Cuál es el metal más abundante en la Tierra?", options: ["Oro", "Plata", "Hierro", "Aluminio"], correct: 3 },
    { question: "¿Cuántos jugadores hay en un equipo de fútbol?", options: ["9", "10", "11", "12"], correct: 2 },
    { question: "¿Cuál es el río más largo del mundo?", options: ["Nilo", "Amazonas", "Yangtsé", "Misisipi"], correct: 1 },
    { question: "¿Cuántos huesos tiene el cuerpo humano adulto?", options: ["186", "206", "226", "246"], correct: 1 },
    { question: "¿Quién escribió Don Quijote?", options: ["Lope de Vega", "Cervantes", "Góngora", "Quevedo"], correct: 1 },
    { question: "¿Cuál es el país más grande del mundo?", options: ["Canadá", "China", "Rusia", "Estados Unidos"], correct: 2 },
    { question: "¿En qué año comenzó la Segunda Guerra Mundial?", options: ["1935", "1939", "1941", "1945"], correct: 1 },
    { question: "¿Cuál es la montaña más alta del mundo?", options: ["K2", "Everest", "Kilimanjaro", "Aconcagua"], correct: 1 },
    { question: "¿Cuántas teclas tiene un piano estándar?", options: ["76", "82", "88", "92"], correct: 2 },
    { question: "¿Qué gas respiramos principalmente?", options: ["Oxígeno", "Nitrógeno", "Dióxido de carbono", "Hidrógeno"], correct: 1 },
    { question: "¿Cuál es la velocidad de la luz?", options: ["300.000 km/s", "150.000 km/s", "500.000 km/s", "1.000.000 km/s"], correct: 0 },
    { question: "¿Quién fue el primer presidente de Estados Unidos?", options: ["Jefferson", "Washington", "Lincoln", "Adams"], correct: 1 },
    { question: "¿Cuántos lados tiene un hexágono?", options: ["5", "6", "7", "8"], correct: 1 },
    { question: "¿En qué continente está Egipto?", options: ["Asia", "África", "Europa", "Oceanía"], correct: 1 },
    { question: "¿Cuál es el idioma más hablado del mundo?", options: ["Inglés", "Español", "Chino mandarín", "Hindi"], correct: 2 },
    { question: "¿Cuántos colores tiene el arcoíris?", options: ["5", "6", "7", "8"], correct: 2 },
    { question: "¿Qué órgano del cuerpo humano es el más grande?", options: ["Hígado", "Cerebro", "Piel", "Intestino"], correct: 2 },
    { question: "¿Cuál es la capital de Japón?", options: ["Kioto", "Osaka", "Tokio", "Hiroshima"], correct: 2 },
    { question: "¿Cuántos minutos tiene un partido de fútbol?", options: ["80", "90", "100", "120"], correct: 1 },
    { question: "¿Quién descubrió América?", options: ["Magallanes", "Colón", "Vespucio", "Cortés"], correct: 1 },
    { question: "¿Cuál es el animal más grande del mundo?", options: ["Elefante", "Tiburón ballena", "Ballena azul", "Orca"], correct: 2 },
    { question: "¿En qué año cayó el Muro de Berlín?", options: ["1985", "1987", "1989", "1991"], correct: 2 },
    { question: "¿Cuántos dientes tiene un adulto?", options: ["28", "30", "32", "34"], correct: 2 },
    { question: "¿Cuál es la capital de Italia?", options: ["Milán", "Roma", "Venecia", "Nápoles"], correct: 1 },
    { question: "¿Qué elemento químico tiene símbolo H?", options: ["Helio", "Hidrógeno", "Hafnio", "Holmio"], correct: 1 },
    { question: "¿Cuántos años tiene un lustro?", options: ["3", "5", "10", "15"], correct: 1 },
    { question: "¿Quién escribió Romeo y Julieta?", options: ["Cervantes", "Dante", "Shakespeare", "Molière"], correct: 2 },
    { question: "¿Cuál es el país más poblado del mundo?", options: ["India", "China", "Estados Unidos", "Indonesia"], correct: 1 },
    { question: "¿En qué año se descubrió América?", options: ["1490", "1492", "1494", "1500"], correct: 1 },
    { question: "¿Cuántos metros tiene un kilómetro?", options: ["100", "500", "1000", "10000"], correct: 2 },
    { question: "¿Cuál es la capital de España?", options: ["Barcelona", "Sevilla", "Madrid", "Valencia"], correct: 2 },
    { question: "¿Cuántas patas tiene una araña?", options: ["6", "8", "10", "12"], correct: 1 },
    { question: "¿Qué planeta es conocido como el planeta rojo?", options: ["Venus", "Marte", "Júpiter", "Saturno"], correct: 1 },
    { question: "¿Cuántos lados tiene un triángulo?", options: ["2", "3", "4", "5"], correct: 1 },
    { question: "¿Quién pintó la Capilla Sixtina?", options: ["Da Vinci", "Rafael", "Miguel Ángel", "Donatello"], correct: 2 },
    { question: "¿Cuál es el metal precioso más valioso?", options: ["Oro", "Platino", "Rodio", "Diamante"], correct: 2 },
    { question: "¿Cuántos años tiene un siglo?", options: ["50", "100", "200", "1000"], correct: 1 },
    { question: "¿En qué país está la Torre de Pisa?", options: ["Francia", "Italia", "España", "Grecia"], correct: 1 },
    { question: "¿Cuántos días tiene un año bisiesto?", options: ["364", "365", "366", "367"], correct: 2 },
    { question: "¿Cuál es el océano más pequeño?", options: ["Ártico", "Índico", "Atlántico", "Pacífico"], correct: 0 },
    { question: "¿Quién inventó la bombilla?", options: ["Tesla", "Edison", "Einstein", "Bell"], correct: 1 },
    { question: "¿Cuántos grados tiene un ángulo recto?", options: ["45", "60", "90", "180"], correct: 2 },
    { question: "¿Cuál es el río más caudaloso del mundo?", options: ["Nilo", "Amazonas", "Congo", "Yangtsé"], correct: 1 },
    { question: "¿Cuántos corazones tiene un pulpo?", options: ["1", "2", "3", "4"], correct: 2 },
    { question: "¿En qué país se inventó el papel?", options: ["India", "China", "Egipto", "Grecia"], correct: 1 },
    { question: "¿Cuál es la lengua oficial de Brasil?", options: ["Español", "Portugués", "Francés", "Inglés"], correct: 1 },
    { question: "¿Cuántos km² tiene aproximadamente España?", options: ["400.000", "505.000", "600.000", "700.000"], correct: 1 },
    { question: "¿Qué significa CPU?", options: ["Central Process Unit", "Computer Personal Unit", "Central Processing Unit", "Central Power Unit"], correct: 2 },
    { question: "¿Cuál es el deporte más popular del mundo?", options: ["Baloncesto", "Fútbol", "Tenis", "Cricket"], correct: 1 },
    { question: "¿En qué año se fundó Google?", options: ["1996", "1998", "2000", "2002"], correct: 1 },
    { question: "¿Cuántos años duró la Guerra de los 100 años?", options: ["100", "116", "98", "120"], correct: 1 },
    { question: "¿Cuál es la capital de Australia?", options: ["Sídney", "Melbourne", "Canberra", "Perth"], correct: 2 },
    { question: "¿Qué vitamina aporta principalmente el Sol?", options: ["Vitamina A", "Vitamina C", "Vitamina D", "Vitamina E"], correct: 2 },
    { question: "¿Cuántos minutos tiene una hora?", options: ["50", "60", "70", "80"], correct: 1 },
    { question: "¿Qué animal es Dumbo?", options: ["Rinoceronte", "Hipopótamo", "Elefante", "Oso"], correct: 2 },
    { question: "¿Cuál es la moneda de Japón?", options: ["Yuan", "Won", "Yen", "Rupia"], correct: 2 },
    { question: "¿Cuántos jugadores hay en un equipo de baloncesto?", options: ["4", "5", "6", "7"], correct: 1 },
    { question: "¿En qué continente está la India?", options: ["África", "Asia", "Europa", "Oceanía"], correct: 1 },
    { question: "¿Cuál es el animal más rápido del mar?", options: ["Tiburón", "Delfín", "Pez vela", "Orca"], correct: 2 },
    { question: "¿Cuántas cuerdas tiene una guitarra española?", options: ["4", "5", "6", "7"], correct: 2 },
    { question: "¿Qué país tiene forma de bota?", options: ["España", "Italia", "Grecia", "Portugal"], correct: 1 },
    { question: "¿Cuántos segundos tiene un minuto?", options: ["50", "60", "70", "100"], correct: 1 },
    { question: "¿Qué mide un termómetro?", options: ["Presión", "Temperatura", "Humedad", "Velocidad"], correct: 1 },
    { question: "¿Cuál es la capital de Alemania?", options: ["Múnich", "Hamburgo", "Berlín", "Frankfurt"], correct: 2 },
    { question: "¿Cuántos lados tiene un pentágono?", options: ["4", "5", "6", "7"], correct: 1 },
    { question: "¿En qué año comenzó la Primera Guerra Mundial?", options: ["1912", "1914", "1916", "1918"], correct: 1 },
    { question: "¿Cuál es el país más pequeño del mundo?", options: ["Mónaco", "Vaticano", "San Marino", "Liechtenstein"], correct: 1 },
    { question: "¿Cuántas patas tiene un insecto?", options: ["4", "6", "8", "10"], correct: 1 },
    { question: "¿Qué es el ADN?", options: ["Ácido desoxirribonucleico", "Ácido dinucleico", "Ácido ribonucleico", "Ácido nucleico"], correct: 0 },
    { question: "¿Cuál es la capital de Portugal?", options: ["Oporto", "Lisboa", "Coímbra", "Braga"], correct: 1 },
    { question: "¿Cuántos años tiene una década?", options: ["5", "10", "20", "50"], correct: 1 },
    { question: "¿Qué estudia la botánica?", options: ["Animales", "Plantas", "Rocas", "Clima"], correct: 1 },
    { question: "¿En qué año se hundió el Titanic?", options: ["1910", "1912", "1914", "1916"], correct: 1 },
    { question: "¿Cuántos centímetros tiene un metro?", options: ["10", "50", "100", "1000"], correct: 2 },
    { question: "¿Cuál es el símbolo químico del oro?", options: ["Go", "Au", "Or", "Gd"], correct: 1 },
    { question: "¿Cuántos meses tienen 31 días?", options: ["5", "6", "7", "8"], correct: 2 },
    { question: "¿Qué invento patentó Alexander Graham Bell?", options: ["Radio", "Teléfono", "Telégrafo", "Bombilla"], correct: 1 },
    { question: "¿Cuál es la capital de Inglaterra?", options: ["Manchester", "Liverpool", "Londres", "Birmingham"], correct: 2 },
    { question: "¿Cuántos gramos tiene un kilogramo?", options: ["100", "500", "1000", "10000"], correct: 2 },
    { question: "¿Qué estudia la astronomía?", options: ["Tierra", "Cuerpos celestes", "Animales", "Plantas"], correct: 1 },
    { question: "¿En qué país está Machu Picchu?", options: ["Bolivia", "Perú", "Ecuador", "Colombia"], correct: 1 },
    { question: "¿Cuántas letras tiene el alfabeto español?", options: ["26", "27", "28", "29"], correct: 1 },
    { question: "¿Qué es H2O?", options: ["Oxígeno", "Hidrógeno", "Agua", "Aire"], correct: 2 },
    { question: "¿Cuál es el metal más abundante en el universo?", options: ["Hierro", "Hidrógeno", "Helio", "Carbono"], correct: 1 },
    { question: "¿Cuántas estaciones tiene el año?", options: ["2", "3", "4", "5"], correct: 2 },
    { question: "¿Qué es un mamífero?", options: ["Animal con pelo que amamanta", "Animal que vuela", "Animal acuático", "Animal con escamas"], correct: 0 },
    { question: "¿En qué país se encuentra la Estatua de la Libertad?", options: ["Francia", "Inglaterra", "Estados Unidos", "Canadá"], correct: 2 },
    { question: "¿Cuántos días tiene febrero en año normal?", options: ["27", "28", "29", "30"], correct: 1 },
    { question: "¿Qué mide un barómetro?", options: ["Temperatura", "Presión atmosférica", "Humedad", "Viento"], correct: 1 },
    { question: "¿Cuál es la capital de Canadá?", options: ["Toronto", "Vancouver", "Ottawa", "Montreal"], correct: 2 },
    { question: "¿Cuántas caras tiene un dado normal?", options: ["4", "6", "8", "12"], correct: 1 },
    { question: "¿Qué estudia la geología?", options: ["Vida", "Tierra y rocas", "Agua", "Aire"], correct: 1 },
    { question: "¿En qué año llegó Colón a América?", options: ["1490", "1492", "1494", "1500"], correct: 1 },
    { question: "¿Cuántos milímetros tiene un centímetro?", options: ["5", "10", "100", "1000"], correct: 1 },
    { question: "¿Cuál es el símbolo químico de la plata?", options: ["Pt", "Ag", "Al", "Pl"], correct: 1 },
    { question: "¿Cuántas horas tiene un día?", options: ["12", "20", "24", "48"], correct: 2 },
    { question: "¿Qué invento Leonardo da Vinci?", options: ["Avión", "Helicóptero (boceto)", "Coche", "Barco"], correct: 1 },
    { question: "¿Cuál es la capital de México?", options: ["Guadalajara", "Monterrey", "Ciudad de México", "Cancún"], correct: 2 },
    { question: "¿Cuántos dedos tiene una mano?", options: ["4", "5", "6", "10"], correct: 1 },
    { question: "¿Qué estudia la zoología?", options: ["Plantas", "Animales", "Rocas", "Clima"], correct: 1 },
    { question: "¿En qué país está el Taj Mahal?", options: ["Pakistán", "India", "Bangladesh", "Nepal"], correct: 1 },
    { question: "¿Cuántas semanas tiene un año?", options: ["48", "50", "52", "54"], correct: 2 },
    { question: "¿Qué es el CO2?", options: ["Oxígeno", "Monóxido de carbono", "Dióxido de carbono", "Hidrógeno"], correct: 2 },
    { question: "¿Cuál es la montaña más alta de África?", options: ["Kilimanjaro", "Monte Kenia", "Atlas", "Drakensberg"], correct: 0 },
    { question: "¿Cuántos años tiene un milenio?", options: ["100", "500", "1000", "10000"], correct: 2 },
    { question: "¿Qué mide un velocímetro?", options: ["Distancia", "Velocidad", "Temperatura", "Presión"], correct: 1 },
    { question: "¿En qué país está las Pirámides de Giza?", options: ["Sudán", "Egipto", "Libia", "Túnez"], correct: 1 },
    { question: "¿Cuántos meses tiene un año?", options: ["10", "11", "12", "13"], correct: 2 },
    { question: "¿Qué estudia la física?", options: ["Vida", "Materia y energía", "Tierra", "Clima"], correct: 1 },
    { question: "¿Cuál es la capital de Argentina?", options: ["Córdoba", "Rosario", "Buenos Aires", "Mendoza"], correct: 2 },
    { question: "¿Cuántos lados tiene un octógono?", options: ["6", "7", "8", "9"], correct: 2 },
    { question: "¿Qué inventor creó la lámpara incandescente?", options: ["Tesla", "Edison", "Bell", "Marconi"], correct: 1 },
    { question: "¿En qué país está el Coliseo Romano?", options: ["Grecia", "Italia", "España", "Turquía"], correct: 1 },
    { question: "¿Cuántos centímetros tiene un kilómetro?", options: ["1000", "10000", "100000", "1000000"], correct: 2 },
    { question: "¿Cuál es el símbolo químico del hierro?", options: ["Fe", "Fi", "Ir", "Hr"], correct: 0 },
    { question: "¿Cuántas pulgadas tiene un pie?", options: ["10", "12", "14", "16"], correct: 1 },
    { question: "¿Qué estudia la química?", options: ["Vida", "Materia y sus cambios", "Tierra", "Estrellas"], correct: 1 },
    { question: "¿Cuál es la capital de Perú?", options: ["Cuzco", "Arequipa", "Lima", "Trujillo"], correct: 2 },
    { question: "¿Cuántos lados tiene un cuadrado?", options: ["3", "4", "5", "6"], correct: 1 },
    { question: "¿Qué mide un altímetro?", options: ["Temperatura", "Velocidad", "Altitud", "Presión"], correct: 2 },
    { question: "¿En qué país están las Cataratas del Niágara?", options: ["USA y Canadá", "USA y México", "Canadá", "USA"], correct: 0 },
    { question: "¿Cuántos días tiene una semana?", options: ["5", "6", "7", "8"], correct: 2 },
    { question: "¿Qué es la fotosíntesis?", options: ["Proceso de las plantas", "Proceso animal", "Proceso del agua", "Proceso del aire"], correct: 0 },
    { question: "¿Cuál es la capital de Chile?", options: ["Valparaíso", "Concepción", "Santiago", "Viña del Mar"], correct: 2 },
    { question: "¿Cuántos grados tiene un círculo completo?", options: ["180", "270", "360", "450"], correct: 2 },
    { question: "¿Qué inventor patentó el telégrafo?", options: ["Bell", "Edison", "Morse", "Tesla"], correct: 2 },
    { question: "¿En qué país está la Gran Muralla?", options: ["Japón", "China", "Mongolia", "Corea"], correct: 1 },
    { question: "¿Cuántas estrellas tiene la bandera de USA?", options: ["48", "49", "50", "51"], correct: 2 },
    { question: "¿Qué estudia la biología?", options: ["Rocas", "Vida", "Clima", "Estrellas"], correct: 1 },
    { question: "¿Cuál es la capital de Colombia?", options: ["Medellín", "Cali", "Bogotá", "Cartagena"], correct: 2 },
    { question: "¿Cuántos minutos tiene media hora?", options: ["20", "25", "30", "35"], correct: 2 },
    { question: "¿Qué mide un cronómetro?", options: ["Distancia", "Velocidad", "Tiempo", "Temperatura"], correct: 2 },
    { question: "¿En qué país está el Big Ben?", options: ["Francia", "Alemania", "Inglaterra", "Escocia"], correct: 2 },
    { question: "¿Cuántos planetas hay en el sistema solar?", options: ["7", "8", "9", "10"], correct: 1 },
    { question: "¿Qué es la gravedad?", options: ["Fuerza de atracción", "Fuerza de repulsión", "Energía", "Movimiento"], correct: 0 },
    { question: "¿Cuál es la capital de Venezuela?", options: ["Maracaibo", "Valencia", "Caracas", "Barquisimeto"], correct: 2 },
    { question: "¿Cuántos centímetros cuadrados tiene un metro cuadrado?", options: ["100", "1000", "10000", "100000"], correct: 2 },
    { question: "¿Qué inventor creó el fonógrafo?", options: ["Bell", "Edison", "Tesla", "Marconi"], correct: 1 },
    { question: "¿En qué país está la Torre CN?", options: ["USA", "Canadá", "México", "Inglaterra"], correct: 1 },
    { question: "¿Cuántos años tiene un quinquenio?", options: ["3", "5", "10", "15"], correct: 1 },
    { question: "¿Qué estudia la meteorología?", options: ["Tierra", "Clima", "Agua", "Plantas"], correct: 1 },
    { question: "¿Cuál es la capital de Ecuador?", options: ["Guayaquil", "Cuenca", "Quito", "Ambato"], correct: 2 },
    { question: "¿Cuántos lados tiene un heptágono?", options: ["5", "6", "7", "8"], correct: 2 },
    { question: "¿Qué mide un anemómetro?", options: ["Temperatura", "Presión", "Velocidad del viento", "Humedad"], correct: 2 },
    { question: "¿En qué país está el Kremlin?", options: ["Ucrania", "Rusia", "Polonia", "Bielorrusia"], correct: 1 },
    { question: "¿Cuántos segundos tiene una hora?", options: ["360", "1800", "3600", "7200"], correct: 2 },
    { question: "¿Qué es la evaporación?", options: ["Agua a vapor", "Vapor a agua", "Agua a hielo", "Hielo a agua"], correct: 0 },
    { question: "¿Cuál es la capital de Uruguay?", options: ["Punta del Este", "Salto", "Montevideo", "Colonia"], correct: 2 },
    { question: "¿Cuántos lados tiene un nonágono?", options: ["7", "8", "9", "10"], correct: 2 },
    { question: "¿Qué inventor patentó la radio?", options: ["Tesla", "Edison", "Marconi", "Bell"], correct: 2 },
    { question: "¿En qué país está Stonehenge?", options: ["Irlanda", "Escocia", "Inglaterra", "Gales"], correct: 2 },
    { question: "¿Cuántos años-luz dista el Sol de la Tierra?", options: ["8 minutos-luz", "1 año-luz", "4 años-luz", "100 años-luz"], correct: 0 },
    { question: "¿Qué estudia la paleontología?", options: ["Plantas", "Fósiles", "Rocas", "Clima"], correct: 1 },
    { question: "¿Cuál es la capital de Bolivia?", options: ["Santa Cruz", "La Paz/Sucre", "Cochabamba", "Oruro"], correct: 1 },
    { question: "¿Cuántos mililitros tiene un litro?", options: ["10", "100", "1000", "10000"], correct: 2 },
    { question: "¿Qué mide un pluviómetro?", options: ["Temperatura", "Viento", "Lluvia", "Presión"], correct: 2 },
    { question: "¿En qué país está la Torre de Belém?", options: ["España", "Portugal", "Brasil", "Italia"], correct: 1 },
    { question: "¿Cuántos siglos tiene un milenio?", options: ["5", "10", "100", "1000"], correct: 1 },
    { question: "¿Qué es la condensación?", options: ["Agua a vapor", "Vapor a agua", "Agua a hielo", "Hielo a agua"], correct: 1 },
    { question: "¿Cuál es la capital de Paraguay?", options: ["Ciudad del Este", "Encarnación", "Asunción", "Pedro Juan Caballero"], correct: 2 },
    { question: "¿Cuántos grados Celsius son 0 grados Kelvin?", options: ["-100", "-273", "-373", "-200"], correct: 1 },
    { question: "¿Qué inventor creó la dinamita?", options: ["Nobel", "Edison", "Tesla", "Curie"], correct: 0 },
    { question: "¿En qué país está Angkor Wat?", options: ["Tailandia", "Camboya", "Vietnam", "Laos"], correct: 1 },
    { question: "¿Cuántos kilómetros tiene una milla?", options: ["1.2", "1.6", "2.0", "2.5"], correct: 1 },
    { question: "¿Qué estudia la oceanografía?", options: ["Tierra", "Océanos", "Clima", "Animales"], correct: 1 },
    { question: "¿Cuál es la capital de Costa Rica?", options: ["Cartago", "Limón", "San José", "Alajuela"], correct: 2 },
    { question: "¿Cuántos satélites naturales tiene Marte?", options: ["0", "1", "2", "3"], correct: 2 },
    { question: "¿Qué mide un odómetro?", options: ["Velocidad", "Distancia recorrida", "Temperatura", "Presión"], correct: 1 },
    { question: "¿En qué país está Petra?", options: ["Israel", "Jordania", "Egipto", "Siria"], correct: 1 },
    { question: "¿Cuántos años tiene un bienio?", options: ["1", "2", "5", "10"], correct: 1 },
    { question: "¿Qué es la sublimación?", options: ["Agua a vapor", "Sólido a gas", "Gas a líquido", "Líquido a sólido"], correct: 1 },
    { question: "¿Cuál es la capital de Panamá?", options: ["Colón", "David", "Panamá", "Chitré"], correct: 2 },
    { question: "¿Cuántos litros tiene un metro cúbico?", options: ["10", "100", "1000", "10000"], correct: 2 },
    { question: "¿Qué inventor descubrió la penicilina?", options: ["Pasteur", "Fleming", "Koch", "Curie"], correct: 1 },
    { question: "¿En qué país está Chichén Itzá?", options: ["Guatemala", "México", "Belice", "Honduras"], correct: 1 },
    { question: "¿Cuántos años tiene un trienio?", options: ["2", "3", "4", "5"], correct: 1 },
    { question: "¿Qué estudia la sismología?", options: ["Clima", "Terremotos", "Volcanes", "Océanos"], correct: 1 },
    { question: "¿Cuál es la capital de Guatemala?", options: ["Antigua", "Quetzaltenango", "Ciudad de Guatemala", "Escuintla"], correct: 2 },
    { question: "¿Cuántos planetas del sistema solar son gigantes gaseosos?", options: ["2", "3", "4", "5"], correct: 2 },
    { question: "¿Qué mide un higrómetro?", options: ["Temperatura", "Presión", "Humedad", "Viento"], correct: 2 },
    { question: "¿En qué país está Ayers Rock (Uluru)?", options: ["Nueva Zelanda", "Australia", "Sudáfrica", "Chile"], correct: 1 },
    { question: "¿Cuántos segundos tiene un día?", options: ["43200", "86400", "172800", "259200"], correct: 1 },
    { question: "¿Qué es la fusión?", options: ["Sólido a líquido", "Líquido a gas", "Gas a sólido", "Líquido a sólido"], correct: 0 },
    { question: "¿Cuál es la capital de Honduras?", options: ["San Pedro Sula", "La Ceiba", "Tegucigalpa", "Comayagua"], correct: 2 },
    { question: "¿Cuántos huesos tiene un bebé al nacer?", options: ["206", "270", "300", "350"], correct: 1 },
    { question: "¿Qué inventor descubrió los rayos X?", options: ["Curie", "Röntgen", "Edison", "Tesla"], correct: 1 },
    { question: "¿En qué país está el Monte Fuji?", options: ["China", "Japón", "Corea", "Vietnam"], correct: 1 },
    { question: "¿Cuántos cromosomas tiene un ser humano?", options: ["23", "46", "48", "50"], correct: 1 },
    { question: "¿Qué estudia la entomología?", options: ["Plantas", "Peces", "Insectos", "Aves"], correct: 2 },
    { question: "¿Cuál es la capital de Nicaragua?", options: ["León", "Granada", "Managua", "Masaya"], correct: 2 },
    { question: "¿Cuántos minutos tiene un día?", options: ["720", "1440", "2880", "4320"], correct: 1 },
    { question: "¿Qué mide un lactómetro?", options: ["Acidez", "Densidad de la leche", "Temperatura", "Grasa"], correct: 1 },
    { question: "¿En qué país está la Alhambra?", options: ["Portugal", "España", "Marruecos", "Italia"], correct: 1 },
    { question: "¿Cuántos elementos tiene la tabla periódica?", options: ["92", "103", "118", "120"], correct: 2 },
    { question: "¿Qué es la solidificación?", options: ["Sólido a líquido", "Líquido a sólido", "Gas a líquido", "Líquido a gas"], correct: 1 },
    { question: "¿Cuál es la capital de El Salvador?", options: ["Santa Ana", "San Miguel", "San Salvador", "La Libertad"], correct: 2 },
    { question: "¿Cuántas vértebras tiene la columna humana?", options: ["24", "33", "42", "50"], correct: 1 },
    { question: "¿Qué inventor creó el primer automóvil?", options: ["Ford", "Benz", "Daimler", "Diesel"], correct: 1 },
    { question: "¿En qué país está Cristo Redentor?", options: ["Argentina", "Brasil", "Uruguay", "Chile"], correct: 1 },
    { question: "¿Cuántos litros de sangre tiene un adulto?", options: ["3-4", "5-6", "7-8", "9-10"], correct: 1 },
    { question: "¿Qué estudia la ornitología?", options: ["Insectos", "Peces", "Aves", "Mamíferos"], correct: 2 },
    { question: "¿Cuál es la capital de Cuba?", options: ["Santiago", "Camagüey", "La Habana", "Holguín"], correct: 2 },
    { question: "¿Cuántos continentes habitados hay?", options: ["5", "6", "7", "8"], correct: 1 },
    { question: "¿Qué mide un luxómetro?", options: ["Luz", "Sonido", "Temperatura", "Presión"], correct: 0 },
    { question: "¿En qué país está la Sagrada Familia?", options: ["Italia", "España", "Francia", "Portugal"], correct: 1 },
    { question: "¿Cuántos músculos tiene el cuerpo humano?", options: ["400", "500", "600", "700"], correct: 2 },
    { question: "¿Qué es un eclipse solar?", options: ["Luna tapa al Sol", "Sol tapa a la Luna", "Tierra tapa al Sol", "Sol tapa a la Tierra"], correct: 0 },
    { question: "¿Cuál es la capital de República Dominicana?", options: ["Santiago", "La Romana", "Santo Domingo", "Punta Cana"], correct: 2 },
    { question: "¿Cuántos océanos hay?", options: ["3", "4", "5", "6"], correct: 2 },
    { question: "¿Qué inventor creó el avión?", options: ["Wright", "Santos Dumont", "Blériot", "Lindbergh"], correct: 0 },
    { question: "¿En qué país está Burj Khalifa?", options: ["Arabia Saudí", "Emiratos Árabes", "Qatar", "Kuwait"], correct: 1 },
    { question: "¿Cuántos pares de costillas tiene un humano?", options: ["10", "12", "14", "16"], correct: 1 },
    { question: "¿Qué estudia la herpetología?", options: ["Aves", "Reptiles", "Peces", "Insectos"], correct: 1 },
    { question: "¿Cuál es la capital de Haití?", options: ["Gonaïves", "Cap-Haïtien", "Puerto Príncipe", "Les Cayes"], correct: 2 }
];

// Función para seleccionar preguntas aleatorias
function getRandomQuestions(count = 10) {
    const shuffled = allQuestions.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

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
                score: 0,
                questionsAnswered: 0
            }],
            currentQuestion: 0,
            currentPlayerIndex: 0, // Índice del jugador que tiene el turno
            started: false,
            questions: getRandomQuestions(30) // 30 preguntas (15 para cada jugador)
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
        
        // Verificar si el juego terminó (ambos jugadores completaron 15 preguntas)
        if (room.players.every(p => p.questionsAnswered >= 15)) {
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
            if (room.players.every(p => p.questionsAnswered >= 15)) {
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
        totalQuestions: 15
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
