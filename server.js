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
    { question: "¿Cuál es la capital de Haití?", options: ["Gonaïves", "Cap-Haïtien", "Puerto Príncipe", "Les Cayes"], correct: 2 },
    { question: "¿Cuántos jugadores tiene un equipo de béisbol en el campo?", options: ["8", "9", "10", "11"], correct: 1 },
    { question: "¿Qué gas respiran las plantas?", options: ["Oxígeno", "Nitrógeno", "Dióxido de carbono", "Helio"], correct: 2 },
    { question: "¿Cuál es el océano más profundo?", options: ["Atlántico", "Índico", "Pacífico", "Ártico"], correct: 2 },
    { question: "¿En qué continente está el desierto del Sahara?", options: ["Asia", "América", "África", "Oceanía"], correct: 2 },
    { question: "¿Cuántos lados tiene un hexágono?", options: ["5", "6", "7", "8"], correct: 1 },
    { question: "¿Qué animal es el símbolo de WWF?", options: ["Tigre", "Oso panda", "Elefante", "Ballena"], correct: 1 },
    { question: "¿Cuál es el metal más abundante en la Tierra?", options: ["Hierro", "Aluminio", "Cobre", "Oro"], correct: 1 },
    { question: "¿Quién escribió Don Quijote de la Mancha?", options: ["Lope de Vega", "Cervantes", "Calderón", "Góngora"], correct: 1 },
    { question: "¿Cuántos días tiene un año bisiesto?", options: ["364", "365", "366", "367"], correct: 2 },
    { question: "¿Qué planeta es conocido como el planeta rojo?", options: ["Venus", "Marte", "Júpiter", "Saturno"], correct: 1 },
    { question: "¿Cuál es el río más caudaloso del mundo?", options: ["Nilo", "Yangtsé", "Amazonas", "Misisipi"], correct: 2 },
    { question: "¿En qué año cayó el Muro de Berlín?", options: ["1987", "1988", "1989", "1990"], correct: 2 },
    { question: "¿Cuántos huesos tiene el cuerpo humano adulto?", options: ["186", "206", "226", "246"], correct: 1 },
    { question: "¿Qué instrumento mide la presión atmosférica?", options: ["Termómetro", "Barómetro", "Higrómetro", "Anemómetro"], correct: 1 },
    { question: "¿Cuál es la montaña más alta de América?", options: ["Denali", "Aconcagua", "Everest", "Kilimanjaro"], correct: 1 },
    { question: "¿Qué vitamina produce el cuerpo con la luz solar?", options: ["Vitamina A", "Vitamina C", "Vitamina D", "Vitamina E"], correct: 2 },
    { question: "¿Cuántos grados tiene un ángulo recto?", options: ["45", "60", "90", "180"], correct: 2 },
    { question: "¿Qué científico propuso la teoría de la relatividad?", options: ["Newton", "Einstein", "Galileo", "Hawking"], correct: 1 },
    { question: "¿Cuál es el país más poblado del mundo?", options: ["India", "China", "Estados Unidos", "Indonesia"], correct: 1 },
    { question: "¿Qué órgano del cuerpo produce la insulina?", options: ["Hígado", "Páncreas", "Riñón", "Estómago"], correct: 1 },
    { question: "¿En qué deporte se usa un birdie?", options: ["Tenis", "Golf", "Bádminton", "Hockey"], correct: 2 },
    { question: "¿Cuál es la capital de Noruega?", options: ["Oslo", "Bergen", "Stavanger", "Tromsø"], correct: 0 },
    { question: "¿Qué elemento químico tiene símbolo Au?", options: ["Plata", "Oro", "Cobre", "Platino"], correct: 1 },
    { question: "¿Cuántos continentes hay en la Tierra?", options: ["5", "6", "7", "8"], correct: 2 },
    { question: "¿Qué animal es el más rápido del mundo?", options: ["León", "Guepardo", "Antílope", "Caballo"], correct: 1 },
    { question: "¿En qué país se encuentra la Torre Eiffel?", options: ["Italia", "España", "Francia", "Alemania"], correct: 2 },
    { question: "¿Cuántos minutos tiene una hora?", options: ["50", "60", "70", "80"], correct: 1 },
    { question: "¿Qué gas necesitan los seres humanos para respirar?", options: ["Nitrógeno", "Oxígeno", "CO2", "Helio"], correct: 1 },
    { question: "¿Cuál es el satélite natural de la Tierra?", options: ["Sol", "Luna", "Marte", "Venus"], correct: 1 },
    { question: "¿Qué deporte practica Lionel Messi?", options: ["Básquetbol", "Fútbol", "Tenis", "Béisbol"], correct: 1 },
    { question: "¿Cuántos años tiene una década?", options: ["5", "10", "15", "20"], correct: 1 },
    { question: "¿Qué color sale al mezclar azul y amarillo?", options: ["Verde", "Naranja", "Morado", "Rojo"], correct: 0 },
    { question: "¿En qué ciudad está la Estatua de la Libertad?", options: ["Boston", "Nueva York", "Washington", "Chicago"], correct: 1 },
    { question: "¿Cuántos lados tiene un triángulo?", options: ["2", "3", "4", "5"], correct: 1 },
    { question: "¿Qué planeta es el más cercano al Sol?", options: ["Venus", "Mercurio", "Tierra", "Marte"], correct: 1 },
    { question: "¿Cuál es el animal terrestre más grande?", options: ["Rinoceronte", "Hipopótamo", "Elefante", "Jirafa"], correct: 2 },
    { question: "¿Qué idioma se habla en Brasil?", options: ["Español", "Portugués", "Francés", "Inglés"], correct: 1 },
    { question: "¿Cuántos dedos tiene una mano?", options: ["4", "5", "6", "7"], correct: 1 },
    { question: "¿Qué órgano bombea la sangre?", options: ["Cerebro", "Corazón", "Hígado", "Pulmón"], correct: 1 },
    { question: "¿En qué estación del año caen las hojas?", options: ["Primavera", "Verano", "Otoño", "Invierno"], correct: 2 },
    { question: "¿Cuántas patas tiene una araña?", options: ["6", "8", "10", "12"], correct: 1 },
    { question: "¿Qué color tiene el sol?", options: ["Rojo", "Amarillo", "Blanco", "Naranja"], correct: 1 },
    { question: "¿En qué continente está Egipto?", options: ["Asia", "Europa", "África", "América"], correct: 2 },
    { question: "¿Cuántos meses tiene el año?", options: ["10", "11", "12", "13"], correct: 2 },
    { question: "¿Qué animal hace 'miau'?", options: ["Perro", "Gato", "Ratón", "Pájaro"], correct: 1 },
    { question: "¿Cuántos ojos tiene una persona?", options: ["1", "2", "3", "4"], correct: 1 },
    { question: "¿Qué forma tiene una pelota?", options: ["Cuadrada", "Redonda", "Triangular", "Rectangular"], correct: 1 },
    { question: "¿En qué país están las pirámides de Giza?", options: ["México", "Perú", "Egipto", "India"], correct: 2 },
    { question: "¿Cuántas estaciones tiene el año?", options: ["2", "3", "4", "5"], correct: 2 },
    { question: "¿Qué fruta es amarilla y alargada?", options: ["Manzana", "Plátano", "Naranja", "Uva"], correct: 1 },
    { question: "¿Cuál es el color del cielo en un día despejado?", options: ["Verde", "Azul", "Rojo", "Amarillo"], correct: 1 },
    { question: "¿Qué animal dice 'guau'?", options: ["Gato", "Perro", "Vaca", "Caballo"], correct: 1 },
    { question: "¿Cuántos centímetros tiene un metro?", options: ["10", "50", "100", "1000"], correct: 2 },
    { question: "¿Qué planeta tiene anillos visibles?", options: ["Marte", "Júpiter", "Saturno", "Urano"], correct: 2 },
    { question: "¿En qué país se inventó la pizza?", options: ["Francia", "España", "Italia", "Grecia"], correct: 2 },
    { question: "¿Cuántas horas tiene un día?", options: ["12", "24", "36", "48"], correct: 1 },
    { question: "¿Qué animal vuela y hace miel?", options: ["Mosca", "Abeja", "Mariposa", "Libélula"], correct: 1 },
    { question: "¿Cuál es el océano más grande?", options: ["Atlántico", "Índico", "Pacífico", "Ártico"], correct: 2 },
    { question: "¿Qué color sale al mezclar rojo y blanco?", options: ["Naranja", "Rosa", "Morado", "Marrón"], correct: 1 },
    { question: "¿En qué ciudad está el Big Ben?", options: ["París", "Londres", "Roma", "Berlín"], correct: 1 },
    { question: "¿Cuántos lados tiene un cuadrado?", options: ["3", "4", "5", "6"], correct: 1 },
    { question: "¿Qué animal tiene trompa?", options: ["Rinoceronte", "Elefante", "Hipopótamo", "Jirafa"], correct: 1 },
    { question: "¿En qué deporte se usa una raqueta?", options: ["Fútbol", "Tenis", "Natación", "Atletismo"], correct: 1 },
    { question: "¿Cuántos lados tiene un pentágono?", options: ["4", "5", "6", "7"], correct: 1 },
    { question: "¿Qué animal tiene rayas negras y naranjas?", options: ["León", "Tigre", "Leopardo", "Guepardo"], correct: 1 },
    { question: "¿En qué país se encuentra el Taj Mahal?", options: ["China", "India", "Japón", "Tailandia"], correct: 1 },
    { question: "¿Cuántos gramos tiene un kilogramo?", options: ["100", "500", "1000", "10000"], correct: 2 },
    { question: "¿Qué planeta es conocido por sus anillos?", options: ["Venus", "Marte", "Saturno", "Neptuno"], correct: 2 },
    { question: "¿En qué continente está Australia?", options: ["Asia", "Europa", "Oceanía", "América"], correct: 2 },
    { question: "¿Cuántos lados tiene un octágono?", options: ["6", "7", "8", "9"], correct: 2 },
    { question: "¿Qué animal da leche?", options: ["Gallina", "Vaca", "Cabra", "Oveja"], correct: 1 },
    { question: "¿En qué país se habla inglés principalmente?", options: ["Francia", "España", "Inglaterra", "Italia"], correct: 2 },
    { question: "¿Cuántos segundos tiene un minuto?", options: ["30", "60", "90", "120"], correct: 1 },
    { question: "¿Qué color tiene una esmeralda?", options: ["Rojo", "Azul", "Verde", "Amarillo"], correct: 2 },
    { question: "¿En qué ciudad está la Torre de Pisa?", options: ["Roma", "Pisa", "Venecia", "Milán"], correct: 1 },
    { question: "¿Cuántos jugadores hay en un equipo de fútbol?", options: ["9", "10", "11", "12"], correct: 2 },
    { question: "¿Qué animal tiene joroba?", options: ["Caballo", "Camello", "Elefante", "Jirafa"], correct: 1 },
    { question: "¿En qué país están las cataratas del Niágara?", options: ["México", "Canadá/EE.UU.", "Brasil", "Argentina"], correct: 1 },
    { question: "¿Cuántos milímetros tiene un centímetro?", options: ["1", "10", "100", "1000"], correct: 1 },
    { question: "¿Qué planeta es el tercero desde el Sol?", options: ["Venus", "Tierra", "Marte", "Júpiter"], correct: 1 },
    { question: "¿En qué continente está Japón?", options: ["Europa", "Asia", "Oceanía", "América"], correct: 1 },
    { question: "¿Cuántos lados tiene un heptágono?", options: ["5", "6", "7", "8"], correct: 2 },
    { question: "¿Qué animal hace 'muu'?", options: ["Caballo", "Vaca", "Cerdo", "Oveja"], correct: 1 },
    { question: "¿En qué país se encuentra Machu Picchu?", options: ["Chile", "Perú", "Bolivia", "Ecuador"], correct: 1 },
    { question: "¿Cuántos días tiene febrero en año bisiesto?", options: ["28", "29", "30", "31"], correct: 1 },
    { question: "¿Qué color sale al mezclar rojo y azul?", options: ["Verde", "Naranja", "Morado", "Marrón"], correct: 2 },
    { question: "¿En qué ciudad está el Coliseo?", options: ["Atenas", "Roma", "Madrid", "París"], correct: 1 },
    { question: "¿Cuántos centímetros tiene un decímetro?", options: ["1", "10", "100", "1000"], correct: 1 },
    { question: "¿Qué animal tiene cuello muy largo?", options: ["Elefante", "Jirafa", "Oso", "León"], correct: 1 },
    { question: "¿En qué deporte se usa un balón ovalado?", options: ["Fútbol", "Rugby", "Baloncesto", "Voleibol"], correct: 1 },
    { question: "¿Cuántos años tiene un siglo?", options: ["10", "50", "100", "1000"], correct: 2 },
    { question: "¿Qué planeta es el más pequeño del sistema solar?", options: ["Mercurio", "Marte", "Venus", "Plutón"], correct: 0 },
    { question: "¿En qué país se encuentra la Gran Muralla?", options: ["Japón", "China", "Corea", "Mongolia"], correct: 1 },
    { question: "¿Cuántos lados tiene un nonágono?", options: ["7", "8", "9", "10"], correct: 2 },
    { question: "¿Qué animal pone huevos?", options: ["Perro", "Gallina", "Vaca", "Caballo"], correct: 1 },
    { question: "¿En qué continente está Rusia?", options: ["Europa", "Asia", "Europa y Asia", "América"], correct: 2 },
    { question: "¿Cuántos metros tiene un kilómetro?", options: ["10", "100", "1000", "10000"], correct: 2 },
    { question: "¿Qué color tiene un rubí?", options: ["Azul", "Rojo", "Verde", "Amarillo"], correct: 1 },
    { question: "¿En qué ciudad está la Ópera de Sídney?", options: ["Melbourne", "Sídney", "Brisbane", "Perth"], correct: 1 },
    { question: "¿Cuántos jugadores hay en un equipo de baloncesto?", options: ["4", "5", "6", "7"], correct: 1 },
    { question: "¿Qué animal hace 'oink'?", options: ["Vaca", "Cerdo", "Caballo", "Oveja"], correct: 1 },
    { question: "¿En qué país está el Cristo Redentor?", options: ["Argentina", "Brasil", "Chile", "Uruguay"], correct: 1 },
    { question: "¿Cuántos días tiene el mes de abril?", options: ["28", "29", "30", "31"], correct: 2 },
    { question: "¿Qué planeta tiene la Gran Mancha Roja?", options: ["Marte", "Júpiter", "Saturno", "Neptuno"], correct: 1 },
    { question: "¿En qué continente está la Antártida?", options: ["Es un continente propio", "Oceanía", "América", "Asia"], correct: 0 },
    { question: "¿Cuántos lados tiene un decágono?", options: ["8", "9", "10", "11"], correct: 2 },
    { question: "¿Qué animal vive en la Antártida?", options: ["Oso polar", "Pingüino", "Foca", "Morsa"], correct: 1 },
    { question: "¿En qué país se encuentra Stonehenge?", options: ["Francia", "Inglaterra", "Irlanda", "Escocia"], correct: 1 },
    { question: "¿Cuántas semanas tiene un año?", options: ["48", "50", "52", "54"], correct: 2 },
    { question: "¿Qué color sale al mezclar amarillo y rojo?", options: ["Verde", "Naranja", "Morado", "Marrón"], correct: 1 },
    { question: "¿En qué ciudad están las pirámides de Teotihuacán?", options: ["Lima", "México", "Bogotá", "Caracas"], correct: 1 },
    { question: "¿Cuántos mililitros tiene un litro?", options: ["100", "500", "1000", "10000"], correct: 2 },
    { question: "¿Qué animal tiene melena?", options: ["Tigre", "León", "Leopardo", "Guepardo"], correct: 1 },
    { question: "¿En qué deporte se usa un guante?", options: ["Fútbol", "Béisbol", "Tenis", "Natación"], correct: 1 },
    { question: "¿Cuántos años tiene un milenio?", options: ["100", "500", "1000", "10000"], correct: 2 },
    { question: "¿Qué planeta tiene más lunas?", options: ["Tierra", "Marte", "Júpiter", "Venus"], correct: 2 },
    { question: "¿En qué país se encuentra Angkor Wat?", options: ["Tailandia", "Camboya", "Vietnam", "Laos"], correct: 1 },
    { question: "¿Cuántos grados tiene un círculo completo?", options: ["180", "270", "360", "450"], correct: 2 },
    { question: "¿Qué animal es el rey de la selva?", options: ["Tigre", "León", "Elefante", "Gorila"], correct: 1 },
    { question: "¿En qué continente está Arabia Saudita?", options: ["África", "Asia", "Europa", "Oceanía"], correct: 1 },
    { question: "¿Cuántos lados tiene un dodecágono?", options: ["10", "11", "12", "13"], correct: 2 },
    { question: "¿Qué color tiene un zafiro?", options: ["Rojo", "Azul", "Verde", "Amarillo"], correct: 1 },
    { question: "¿En qué ciudad está la Basílica de San Pedro?", options: ["Roma", "Vaticano", "Florencia", "Venecia"], correct: 1 },
    { question: "¿Cuántos gramos tiene una tonelada?", options: ["1000", "10000", "100000", "1000000"], correct: 3 },
    { question: "¿Qué animal tiene rayas blancas y negras?", options: ["Caballo", "Cebra", "Burro", "Yegua"], correct: 1 },
    { question: "¿En qué país se encuentra la Acrópolis?", options: ["Italia", "Grecia", "Turquía", "Egipto"], correct: 1 },
    { question: "¿Cuántos días tiene un año normal?", options: ["364", "365", "366", "367"], correct: 1 },
    { question: "¿Qué planeta es conocido como el gigante gaseoso?", options: ["Tierra", "Marte", "Júpiter", "Mercurio"], correct: 2 },
    { question: "¿En qué continente está Argentina?", options: ["Europa", "África", "América", "Oceanía"], correct: 2 },
    { question: "¿Cuántos metros cuadrados tiene una hectárea?", options: ["100", "1000", "10000", "100000"], correct: 2 },
    { question: "¿Qué animal tiene cuernos?", options: ["Caballo", "Toro", "Cerdo", "Oveja"], correct: 1 },
    { question: "¿En qué país se encuentra el Partenón?", options: ["Roma", "Grecia", "Egipto", "Turquía"], correct: 1 },
    { question: "¿Cuántas pulgadas tiene un pie?", options: ["10", "12", "15", "20"], correct: 1 },
    { question: "¿Qué color tiene un topacio?", options: ["Rojo", "Azul", "Amarillo", "Verde"], correct: 2 },
    { question: "¿En qué ciudad está el Museo del Louvre?", options: ["Londres", "París", "Roma", "Madrid"], correct: 1 },
    { question: "¿Cuántos lados tiene un icoságono?", options: ["15", "18", "20", "24"], correct: 2 },
    { question: "¿Qué animal vive en el mar y tiene tentáculos?", options: ["Tiburón", "Pulpo", "Delfín", "Ballena"], correct: 1 },
    { question: "¿En qué país se encuentra Petra?", options: ["Egipto", "Jordania", "Israel", "Siria"], correct: 1 },
    
    // === 200 PREGUNTAS NUEVAS AÑADIDAS ===
    // GEOGRAFÍA AVANZADA
    { question: "¿Cuál es el río más largo de Europa?", options: ["Danubio", "Volga", "Rin", "Támesis"], correct: 1 },
    { question: "¿Cuál es el desierto más grande del mundo?", options: ["Sahara", "Gobi", "Antártida", "Arábigo"], correct: 2 },
    { question: "¿Qué país tiene más islas en el mundo?", options: ["Indonesia", "Filipinas", "Suecia", "Canadá"], correct: 2 },
    { question: "¿Cuál es el lago más profundo del mundo?", options: ["Superior", "Baikal", "Tanganica", "Victoria"], correct: 1 },
    { question: "¿En qué hemisferio está Australia?", options: ["Norte", "Sur", "Este", "Oeste"], correct: 1 },
    { question: "¿Cuál es la montaña más alta de África?", options: ["Kilimanjaro", "Monte Kenia", "Ruwenzori", "Atlas"], correct: 0 },
    { question: "¿Qué país tiene forma de bota?", options: ["España", "Italia", "Grecia", "Portugal"], correct: 1 },
    { question: "¿Cuál es la ciudad más poblada del mundo?", options: ["Tokio", "Delhi", "Shanghái", "São Paulo"], correct: 0 },
    { question: "¿Qué océano separa América de Asia?", options: ["Atlántico", "Índico", "Pacífico", "Ártico"], correct: 2 },
    { question: "¿En qué país está el Monte Fuji?", options: ["China", "Japón", "Corea", "Vietnam"], correct: 1 },
    
    // CIENCIA Y TECNOLOGÍA
    { question: "¿Qué gas hace que las plantas sean verdes?", options: ["Oxígeno", "Clorofila", "Nitrógeno", "Carbono"], correct: 1 },
    { question: "¿Cuántos planetas enanos hay reconocidos?", options: ["3", "5", "7", "9"], correct: 1 },
    { question: "¿Qué metal es líquido a temperatura ambiente?", options: ["Plomo", "Mercurio", "Plata", "Oro"], correct: 1 },
    { question: "¿Cuál es el elemento más abundante en el universo?", options: ["Oxígeno", "Hidrógeno", "Carbono", "Helio"], correct: 1 },
    { question: "¿Quién inventó el avión?", options: ["Santos Dumont", "Hermanos Wright", "Leonardo da Vinci", "Otto Lilienthal"], correct: 1 },
    { question: "¿En qué año se inventó Internet?", options: ["1969", "1983", "1991", "1995"], correct: 0 },
    { question: "¿Qué científico descubrió la estructura del ADN?", options: ["Darwin", "Watson y Crick", "Mendel", "Pasteur"], correct: 1 },
    { question: "¿Cuántos bits tiene un byte?", options: ["4", "8", "16", "32"], correct: 1 },
    { question: "¿Qué es más rápido: la luz o el sonido?", options: ["Luz", "Sonido", "Igual", "Depende"], correct: 0 },
    { question: "¿Cuántas lunas tiene Júpiter aproximadamente?", options: ["12", "39", "79", "95"], correct: 3 },
    
    // HISTORIA MUNDIAL
    { question: "¿Quién fue el primer emperador romano?", options: ["Julio César", "Augusto", "Nerón", "Calígula"], correct: 1 },
    { question: "¿En qué año se firmó la Declaración de Independencia de EE.UU.?", options: ["1774", "1776", "1783", "1789"], correct: 1 },
    { question: "¿Quién fue Cleopatra?", options: ["Reina de Egipto", "Emperatriz romana", "Reina griega", "Faraona persa"], correct: 0 },
    { question: "¿Cuánto duró la Guerra de los Cien Años?", options: ["100 años", "116 años", "99 años", "150 años"], correct: 1 },
    { question: "¿Quién construyó el Coliseo Romano?", options: ["Julio César", "Augusto", "Vespasiano", "Adriano"], correct: 2 },
    { question: "¿En qué siglo fue la Revolución Industrial?", options: ["XVI", "XVII", "XVIII", "XIX"], correct: 2 },
    { question: "¿Quién fue Napoleón Bonaparte?", options: ["Rey francés", "Emperador francés", "General español", "Rey inglés"], correct: 1 },
    { question: "¿En qué año se descubrió América?", options: ["1490", "1492", "1500", "1510"], correct: 1 },
    { question: "¿Quién fue Gandhi?", options: ["Líder indio", "Presidente chino", "Rey japonés", "Emperador mongol"], correct: 0 },
    { question: "¿Cuántos años duró el Imperio Romano?", options: ["500", "1000", "1500", "2000"], correct: 1 },
    
    // DEPORTES AVANZADOS
    { question: "¿En qué deporte se usa un puck?", options: ["Rugby", "Hockey", "Críquet", "Lacrosse"], correct: 1 },
    { question: "¿Cuántos Grand Slam hay en tenis?", options: ["3", "4", "5", "6"], correct: 1 },
    { question: "¿Qué país ganó más Copas del Mundo de fútbol?", options: ["Alemania", "Brasil", "Italia", "Argentina"], correct: 1 },
    { question: "¿Cuántos anillos olímpicos hay?", options: ["3", "4", "5", "6"], correct: 2 },
    { question: "¿En qué deporte destaca Michael Phelps?", options: ["Atletismo", "Natación", "Ciclismo", "Gimnasia"], correct: 1 },
    { question: "¿Cuántos puntos vale un touchdown en fútbol americano?", options: ["3", "6", "7", "10"], correct: 1 },
    { question: "¿En qué deporte se usa una red alta?", options: ["Tenis", "Voleibol", "Bádminton", "Todos"], correct: 3 },
    { question: "¿Cuántas bases hay en béisbol?", options: ["2", "3", "4", "5"], correct: 2 },
    { question: "¿Qué deporte practica Roger Federer?", options: ["Fútbol", "Tenis", "Golf", "Natación"], correct: 1 },
    { question: "¿En qué año se celebraron los primeros Juegos Olímpicos modernos?", options: ["1894", "1896", "1900", "1904"], correct: 1 },
    
    // ARTE Y CULTURA
    { question: "¿Quién pintó 'La noche estrellada'?", options: ["Picasso", "Van Gogh", "Monet", "Dalí"], correct: 1 },
    { question: "¿Quién escribió 'Cien años de soledad'?", options: ["Borges", "García Márquez", "Vargas Llosa", "Cortázar"], correct: 1 },
    { question: "¿En qué ciudad está la Capilla Sixtina?", options: ["Roma", "Vaticano", "Florencia", "Venecia"], correct: 1 },
    { question: "¿Quién compuso 'La Novena Sinfonía'?", options: ["Mozart", "Beethoven", "Bach", "Chopin"], correct: 1 },
    { question: "¿Qué artista pintó 'Guernica'?", options: ["Dalí", "Picasso", "Miró", "Goya"], correct: 1 },
    { question: "¿Quién escribió 'La Odisea'?", options: ["Virgilio", "Homero", "Sófocles", "Platón"], correct: 1 },
    { question: "¿En qué museo está la Mona Lisa?", options: ["Prado", "Louvre", "Metropolitan", "British"], correct: 1 },
    { question: "¿Quién esculpió 'El David'?", options: ["Donatello", "Miguel Ángel", "Bernini", "Rodin"], correct: 1 },
    { question: "¿Qué instrumento tocaba Mozart?", options: ["Violín", "Piano", "Guitarra", "Flauta"], correct: 1 },
    { question: "¿Quién escribió 'Hamlet'?", options: ["Cervantes", "Shakespeare", "Dante", "Goethe"], correct: 1 },
    
    // MATEMÁTICAS AVANZADAS
    { question: "¿Cuánto es la raíz cuadrada de 144?", options: ["10", "12", "14", "16"], correct: 1 },
    { question: "¿Cuánto es 15% de 200?", options: ["20", "25", "30", "35"], correct: 2 },
    { question: "¿Cuántos lados tiene un dodecágono?", options: ["10", "11", "12", "13"], correct: 2 },
    { question: "¿Qué es π (pi) aproximadamente?", options: ["2.71", "3.14", "4.14", "5.14"], correct: 1 },
    { question: "¿Cuánto es 7 × 8?", options: ["54", "56", "58", "60"], correct: 1 },
    { question: "¿Cuántos milímetros hay en 5 centímetros?", options: ["5", "50", "500", "5000"], correct: 1 },
    { question: "¿Cuánto es 100 - 37?", options: ["61", "63", "65", "67"], correct: 1 },
    { question: "¿Cuántos ángulos tiene un triángulo?", options: ["2", "3", "4", "5"], correct: 1 },
    { question: "¿Cuánto es 25 × 4?", options: ["90", "95", "100", "105"], correct: 2 },
    { question: "¿Cuántos minutos hay en 3 horas?", options: ["120", "150", "180", "200"], correct: 2 },
    
    // BIOLOGÍA Y NATURALEZA
    { question: "¿Cuántos corazones tiene un pulpo?", options: ["1", "2", "3", "4"], correct: 2 },
    { question: "¿Qué animal es el mamífero más grande?", options: ["Elefante", "Ballena azul", "Jirafa", "Rinoceronte"], correct: 1 },
    { question: "¿Cuántos ojos tiene una araña típicamente?", options: ["4", "6", "8", "10"], correct: 2 },
    { question: "¿Qué insecto produce seda?", options: ["Araña", "Gusano de seda", "Abeja", "Hormiga"], correct: 1 },
    { question: "¿Cuántas patas tiene un insecto?", options: ["4", "6", "8", "10"], correct: 1 },
    { question: "¿Qué ave no puede volar?", options: ["Águila", "Avestruz", "Loro", "Colibrí"], correct: 1 },
    { question: "¿Qué animal puede cambiar de color?", options: ["Serpiente", "Camaleón", "Lagartija", "Iguana"], correct: 1 },
    { question: "¿Cuánto vive aproximadamente una tortuga?", options: ["20 años", "50 años", "100 años", "200 años"], correct: 2 },
    { question: "¿Qué animal es conocido por su memoria?", options: ["Perro", "Elefante", "Delfín", "Mono"], correct: 1 },
    { question: "¿Qué flor sigue al sol?", options: ["Rosa", "Girasol", "Tulipán", "Margarita"], correct: 1 },
    
    // CINE Y ENTRETENIMIENTO
    { question: "¿Quién dirigió 'Avatar'?", options: ["Spielberg", "Cameron", "Nolan", "Tarantino"], correct: 1 },
    { question: "¿En qué película aparece Jack Sparrow?", options: ["Titanic", "Piratas del Caribe", "Matrix", "Avatar"], correct: 1 },
    { question: "¿Qué actor es Iron Man?", options: ["Chris Evans", "Robert Downey Jr", "Chris Hemsworth", "Mark Ruffalo"], correct: 1 },
    { question: "¿Quién compuso la música de Star Wars?", options: ["Hans Zimmer", "John Williams", "Ennio Morricone", "Danny Elfman"], correct: 1 },
    { question: "¿En qué año se estrenó 'El Padrino'?", options: ["1970", "1972", "1974", "1976"], correct: 1 },
    { question: "¿Qué película ganó el Oscar 2020?", options: ["Joker", "Parásitos", "1917", "Jojo Rabbit"], correct: 1 },
    { question: "¿Quién es el creador de Mickey Mouse?", options: ["Warner", "Disney", "Stan Lee", "Jim Henson"], correct: 1 },
    { question: "¿Qué saga tiene 9 películas principales?", options: ["Harry Potter", "Star Wars", "Marvel", "Fast & Furious"], correct: 1 },
    { question: "¿Quién interpreta a Hermione en Harry Potter?", options: ["Emma Stone", "Emma Watson", "Emma Roberts", "Emily Blunt"], correct: 1 },
    { question: "¿En qué película sale la frase 'Hasta la vista, baby'?", options: ["Rocky", "Terminator", "Rambo", "Depredador"], correct: 1 },
    
    // MÚSICA
    { question: "¿Quién es conocido como el Rey del Pop?", options: ["Elvis", "Michael Jackson", "Prince", "Madonna"], correct: 1 },
    { question: "¿De qué país son los Beatles?", options: ["Estados Unidos", "Inglaterra", "Irlanda", "Australia"], correct: 1 },
    { question: "¿Qué instrumento tiene 88 teclas?", options: ["Órgano", "Piano", "Acordeón", "Sintetizador"], correct: 1 },
    { question: "¿Cuántas cuerdas tiene una guitarra española?", options: ["4", "5", "6", "7"], correct: 2 },
    { question: "¿Quién canta 'Billie Jean'?", options: ["Prince", "Michael Jackson", "Stevie Wonder", "James Brown"], correct: 1 },
    { question: "¿Qué banda canta 'Hotel California'?", options: ["The Doors", "Eagles", "Led Zeppelin", "Pink Floyd"], correct: 1 },
    { question: "¿De dónde es Shakira?", options: ["México", "Colombia", "Argentina", "España"], correct: 1 },
    { question: "¿Qué género musical es Bob Marley?", options: ["Jazz", "Reggae", "Blues", "Rock"], correct: 1 },
    { question: "¿Quién compuso 'Für Elise'?", options: ["Mozart", "Beethoven", "Bach", "Chopin"], correct: 1 },
    { question: "¿Cuántas notas musicales hay?", options: ["5", "6", "7", "8"], correct: 2 },
    
    // TECNOLOGÍA Y COMPUTACIÓN
    { question: "¿Quién fundó Microsoft?", options: ["Steve Jobs", "Bill Gates", "Mark Zuckerberg", "Elon Musk"], correct: 1 },
    { question: "¿Quién fundó Apple?", options: ["Steve Jobs", "Bill Gates", "Mark Zuckerberg", "Elon Musk"], correct: 0 },
    { question: "¿Quién fundó Facebook?", options: ["Steve Jobs", "Bill Gates", "Mark Zuckerberg", "Elon Musk"], correct: 2 },
    { question: "¿Qué significa CPU?", options: ["Computer Personal Unit", "Central Processing Unit", "Central Program Unit", "Computer Power Unit"], correct: 1 },
    { question: "¿Qué significa RAM?", options: ["Random Access Memory", "Read Access Memory", "Random Active Memory", "Real Access Memory"], correct: 0 },
    { question: "¿Qué es HTML?", options: ["Lenguaje de programación", "Lenguaje de marcado", "Base de datos", "Sistema operativo"], correct: 1 },
    { question: "¿Qué empresa creó Android?", options: ["Apple", "Google", "Microsoft", "Samsung"], correct: 1 },
    { question: "¿En qué año se lanzó el primer iPhone?", options: ["2005", "2007", "2009", "2011"], correct: 1 },
    { question: "¿Qué es Python?", options: ["Snake", "Lenguaje de programación", "Red social", "Sistema operativo"], correct: 1 },
    { question: "¿Qué significa WWW?", options: ["World Wide Web", "World Web Wide", "Wide World Web", "Web World Wide"], correct: 0 },
    
    // COMIDA Y GASTRONOMÍA
    { question: "¿De qué país es originaria la pizza?", options: ["Francia", "España", "Italia", "Grecia"], correct: 2 },
    { question: "¿Qué ingrediente principal tiene el guacamole?", options: ["Tomate", "Aguacate", "Chile", "Cebolla"], correct: 1 },
    { question: "¿De qué está hecho el sushi?", options: ["Carne", "Arroz y pescado", "Verduras", "Pasta"], correct: 1 },
    { question: "¿Qué fruta tiene más vitamina C?", options: ["Manzana", "Naranja", "Plátano", "Uva"], correct: 1 },
    { question: "¿De dónde son originarios los tacos?", options: ["España", "México", "Colombia", "Argentina"], correct: 1 },
    { question: "¿Qué es el wasabi?", options: ["Pescado", "Salsa picante", "Arroz", "Alga"], correct: 1 },
    { question: "¿De qué país es el croissant?", options: ["Italia", "Francia", "Bélgica", "Suiza"], correct: 1 },
    { question: "¿Qué se celebra el Día de Acción de Gracias?", options: ["Cosecha", "Independencia", "Navidad", "Año Nuevo"], correct: 0 },
    { question: "¿Qué bebida tiene cafeína?", options: ["Agua", "Café", "Leche", "Jugo"], correct: 1 },
    { question: "¿De qué se hace el chocolate?", options: ["Azúcar", "Cacao", "Vainilla", "Caramelo"], correct: 1 },
    
    // IDIOMAS Y LINGÜÍSTICA
    { question: "¿Cuántas letras tiene el alfabeto español?", options: ["26", "27", "28", "29"], correct: 1 },
    { question: "¿Qué idioma se habla en Brasil?", options: ["Español", "Portugués", "Francés", "Italiano"], correct: 1 },
    { question: "¿Cuál es el idioma más hablado del mundo?", options: ["Inglés", "Chino mandarín", "Español", "Hindi"], correct: 1 },
    { question: "¿De dónde es originario el latín?", options: ["Grecia", "Roma", "España", "Francia"], correct: 1 },
    { question: "¿Qué significa 'hola' en inglés?", options: ["Bye", "Hello", "Thanks", "Please"], correct: 1 },
    { question: "¿Cuántos idiomas oficiales tiene Suiza?", options: ["2", "3", "4", "5"], correct: 2 },
    { question: "¿Qué alfabeto usa Rusia?", options: ["Latino", "Cirílico", "Árabe", "Griego"], correct: 1 },
    { question: "¿Qué idioma se habla en Japón?", options: ["Chino", "Japonés", "Coreano", "Tailandés"], correct: 1 },
    { question: "¿Cómo se dice 'gracias' en francés?", options: ["Danke", "Merci", "Grazie", "Gracias"], correct: 1 },
    { question: "¿Qué idioma tiene más palabras?", options: ["Español", "Inglés", "Chino", "Árabe"], correct: 1 },
    
    // === 120 PREGUNTAS ADICIONALES PARA LLEGAR A 600 ===
    // ECONOMÍA Y NEGOCIOS
    { question: "¿Cuál es la moneda de Japón?", options: ["Won", "Yen", "Yuan", "Baht"], correct: 1 },
    { question: "¿Cuál es la moneda de Reino Unido?", options: ["Euro", "Libra", "Dólar", "Corona"], correct: 1 },
    { question: "¿Qué significa CEO?", options: ["Chief Executive Officer", "Central Executive Officer", "Chief Economic Officer", "Central Economic Officer"], correct: 0 },
    { question: "¿Qué empresa tiene el logo de la manzana mordida?", options: ["Microsoft", "Apple", "Samsung", "Google"], correct: 1 },
    { question: "¿En qué ciudad está Wall Street?", options: ["Los Ángeles", "Nueva York", "Chicago", "Miami"], correct: 1 },
    { question: "¿Qué es Amazon?", options: ["Río", "Empresa", "Selva", "Todas"], correct: 3 },
    { question: "¿Quién es el hombre más rico del mundo 2023?", options: ["Jeff Bezos", "Elon Musk", "Bill Gates", "Mark Zuckerberg"], correct: 1 },
    { question: "¿Qué significa IVA?", options: ["Impuesto Valor Agregado", "Impuesto Venta Agregada", "Impuesto Variable Anual", "Impuesto Venta Anual"], correct: 0 },
    { question: "¿Qué es Bitcoin?", options: ["Moneda física", "Criptomoneda", "Acción", "Bono"], correct: 1 },
    { question: "¿Qué empresa creó el buscador Google?", options: ["Microsoft", "Apple", "Google", "Yahoo"], correct: 2 },
    
    // RELIGIÓN Y MITOLOGÍA
    { question: "¿Cuál es la religión más practicada del mundo?", options: ["Islam", "Cristianismo", "Hinduismo", "Budismo"], correct: 1 },
    { question: "¿Quién es el dios griego del mar?", options: ["Zeus", "Poseidón", "Hades", "Apolo"], correct: 1 },
    { question: "¿Quién es el dios griego del rayo?", options: ["Zeus", "Poseidón", "Hades", "Apolo"], correct: 0 },
    { question: "¿Dónde nació Jesús según la Biblia?", options: ["Nazaret", "Belén", "Jerusalén", "Galilea"], correct: 1 },
    { question: "¿Cuál es el libro sagrado del Islam?", options: ["Biblia", "Corán", "Torá", "Vedas"], correct: 1 },
    { question: "¿Cuántos apóstoles tuvo Jesús?", options: ["10", "12", "14", "16"], correct: 1 },
    { question: "¿Quién es Buda?", options: ["Dios hindú", "Fundador del budismo", "Profeta islámico", "Apóstol cristiano"], correct: 1 },
    { question: "¿En qué ciudad está el Vaticano?", options: ["Nápoles", "Roma", "Milán", "Venecia"], correct: 1 },
    { question: "¿Qué animal representa a Egipto?", options: ["León", "Gato", "Cocodrilo", "Halcón"], correct: 1 },
    { question: "¿Quién es Thor en la mitología nórdica?", options: ["Dios del mar", "Dios del trueno", "Dios del fuego", "Dios del viento"], correct: 1 },
    
    // LITERATURA
    { question: "¿Quién escribió '1984'?", options: ["Aldous Huxley", "George Orwell", "Ray Bradbury", "Isaac Asimov"], correct: 1 },
    { question: "¿Quién escribió 'Harry Potter'?", options: ["J.R.R. Tolkien", "J.K. Rowling", "C.S. Lewis", "George R.R. Martin"], correct: 1 },
    { question: "¿Quién escribió 'El Principito'?", options: ["Jules Verne", "Antoine de Saint-Exupéry", "Victor Hugo", "Albert Camus"], correct: 1 },
    { question: "¿Quién escribió 'Moby Dick'?", options: ["Ernest Hemingway", "Herman Melville", "Mark Twain", "Edgar Allan Poe"], correct: 1 },
    { question: "¿Quién escribió 'Orgullo y prejuicio'?", options: ["Charlotte Brontë", "Jane Austen", "Emily Brontë", "Virginia Woolf"], correct: 1 },
    { question: "¿Quién escribió 'La Metamorfosis'?", options: ["Franz Kafka", "James Joyce", "Thomas Mann", "Hermann Hesse"], correct: 0 },
    { question: "¿Quién escribió 'El Señor de los Anillos'?", options: ["C.S. Lewis", "J.R.R. Tolkien", "George R.R. Martin", "Terry Pratchett"], correct: 1 },
    { question: "¿Quién escribió 'Crónicas de una muerte anunciada'?", options: ["Borges", "García Márquez", "Vargas Llosa", "Cortázar"], correct: 1 },
    { question: "¿Quién escribió 'La Divina Comedia'?", options: ["Petrarca", "Dante", "Boccaccio", "Ariosto"], correct: 1 },
    { question: "¿Quién escribió 'Crimen y castigo'?", options: ["Tolstói", "Dostoyevski", "Chéjov", "Gorki"], correct: 1 },
    
    // QUÍMICA
    { question: "¿Cuál es el símbolo químico del oro?", options: ["Go", "Au", "Or", "Gd"], correct: 1 },
    { question: "¿Cuál es el símbolo químico de la plata?", options: ["Pl", "Ag", "Si", "Ar"], correct: 1 },
    { question: "¿Cuál es el símbolo químico del hierro?", options: ["Hi", "Fe", "Ir", "Hr"], correct: 1 },
    { question: "¿Cuál es el símbolo químico del oxígeno?", options: ["Ox", "O", "O2", "Og"], correct: 1 },
    { question: "¿Cuál es el símbolo químico del carbono?", options: ["Ca", "C", "Cr", "Co"], correct: 1 },
    { question: "¿Cuál es el pH del agua pura?", options: ["5", "7", "9", "11"], correct: 1 },
    { question: "¿Qué gas forma el 78% de la atmósfera?", options: ["Oxígeno", "Nitrógeno", "CO2", "Argón"], correct: 1 },
    { question: "¿Qué es H2O?", options: ["Hidrógeno", "Oxígeno", "Agua", "Peróxido"], correct: 2 },
    { question: "¿Cuántos elementos hay en la tabla periódica?", options: ["92", "108", "118", "126"], correct: 2 },
    { question: "¿Quién creó la tabla periódica?", options: ["Lavoisier", "Mendeléyev", "Dalton", "Bohr"], correct: 1 },
    
    // FÍSICA
    { question: "¿A qué velocidad viaja la luz?", options: ["100,000 km/s", "200,000 km/s", "300,000 km/s", "400,000 km/s"], correct: 2 },
    { question: "¿Qué es la gravedad?", options: ["Fuerza de atracción", "Fuerza de repulsión", "Energía", "Masa"], correct: 0 },
    { question: "¿Quién formuló las leyes del movimiento?", options: ["Galileo", "Newton", "Einstein", "Kepler"], correct: 1 },
    { question: "¿Qué partícula tiene carga negativa?", options: ["Protón", "Electrón", "Neutrón", "Fotón"], correct: 1 },
    { question: "¿Qué es un átomo?", options: ["Molécula", "Partícula más pequeña", "Célula", "Elemento"], correct: 1 },
    { question: "¿Qué mide un termómetro?", options: ["Presión", "Temperatura", "Humedad", "Velocidad"], correct: 1 },
    { question: "¿Qué mide un barómetro?", options: ["Presión atmosférica", "Temperatura", "Humedad", "Velocidad"], correct: 0 },
    { question: "¿Qué es el sonido?", options: ["Luz", "Onda", "Partícula", "Energía"], correct: 1 },
    { question: "¿Cuántos estados de la materia existen?", options: ["2", "3", "4", "5"], correct: 3 },
    { question: "¿Qué es la fotosíntesis?", options: ["Respiración", "Proceso de plantas", "Digestión", "Reproducción"], correct: 1 },
    
    // ASTRONOMÍA
    { question: "¿Qué es una supernova?", options: ["Estrella nueva", "Explosión estelar", "Planeta", "Galaxia"], correct: 1 },
    { question: "¿Qué es un agujero negro?", options: ["Estrella", "Región del espacio", "Planeta", "Galaxia"], correct: 1 },
    { question: "¿Cuántas galaxias hay aproximadamente?", options: ["Miles", "Millones", "Miles de millones", "Trillones"], correct: 3 },
    { question: "¿Qué es la Vía Láctea?", options: ["Estrella", "Planeta", "Galaxia", "Nebulosa"], correct: 2 },
    { question: "¿Qué es Marte?", options: ["Estrella", "Planeta", "Luna", "Asteroide"], correct: 1 },
    { question: "¿Cuántos planetas están más cerca del Sol que la Tierra?", options: ["1", "2", "3", "4"], correct: 1 },
    { question: "¿Qué planeta tiene más lunas?", options: ["Tierra", "Marte", "Júpiter", "Saturno"], correct: 2 },
    { question: "¿Cuál es la estrella más cercana a la Tierra?", options: ["Sirio", "Sol", "Alfa Centauri", "Betelgeuse"], correct: 1 },
    { question: "¿Qué es un cometa?", options: ["Estrella", "Planeta", "Objeto helado", "Luna"], correct: 2 },
    { question: "¿Qué es un asteroide?", options: ["Estrella", "Planeta", "Roca espacial", "Luna"], correct: 2 },
    
    // ANATOMÍA HUMANA
    { question: "¿Cuál es el órgano que limpia la sangre?", options: ["Hígado", "Corazón", "Riñón", "Pulmón"], correct: 2 },
    { question: "¿Dónde está el fémur?", options: ["Brazo", "Pierna", "Espalda", "Cuello"], correct: 1 },
    { question: "¿Qué órgano produce la bilis?", options: ["Páncreas", "Hígado", "Estómago", "Intestino"], correct: 1 },
    { question: "¿Cuántas arterias coronarias principales hay?", options: ["1", "2", "3", "4"], correct: 1 },
    { question: "¿Qué es la hemoglobina?", options: ["Hormona", "Proteína", "Célula", "Tejido"], correct: 1 },
    { question: "¿Dónde se produce la insulina?", options: ["Hígado", "Páncreas", "Estómago", "Riñón"], correct: 1 },
    { question: "¿Cuál es el hueso más pequeño del cuerpo?", options: ["Estribo", "Yunque", "Martillo", "Falange"], correct: 0 },
    { question: "¿Qué parte del ojo da el color?", options: ["Pupila", "Iris", "Retina", "Córnea"], correct: 1 },
    { question: "¿Cuántas cavidades tiene el corazón?", options: ["2", "3", "4", "5"], correct: 2 },
    { question: "¿Qué protege el cráneo?", options: ["Corazón", "Cerebro", "Pulmones", "Hígado"], correct: 1 },
    
    // VIDEOJUEGOS Y CULTURA POP
    { question: "¿Quién es el fontanero de Nintendo?", options: ["Luigi", "Mario", "Wario", "Yoshi"], correct: 1 },
    { question: "¿De qué color es Sonic?", options: ["Rojo", "Azul", "Verde", "Amarillo"], correct: 1 },
    { question: "¿Qué consola creó la Nintendo Switch?", options: ["Sony", "Nintendo", "Microsoft", "Sega"], correct: 1 },
    { question: "¿Qué juego tiene creepers?", options: ["Fortnite", "Minecraft", "Roblox", "Terraria"], correct: 1 },
    { question: "¿Quién es Pikachu?", options: ["Digimon", "Pokémon", "Beyblade", "Tamagotchi"], correct: 1 },
    { question: "¿En qué juego hay Amongus?", options: ["Fall Guys", "Among Us", "Fortnite", "Roblox"], correct: 1 },
    { question: "¿Qué saga tiene a Link como protagonista?", options: ["Mario", "Zelda", "Metroid", "Kirby"], correct: 1 },
    { question: "¿De qué color es Pac-Man?", options: ["Rojo", "Azul", "Amarillo", "Verde"], correct: 2 },
    { question: "¿Qué juego tiene Battle Royale?", options: ["Minecraft", "Fortnite", "Roblox", "Todos"], correct: 1 },
    { question: "¿Quién es el villano de Mario?", options: ["Wario", "Bowser", "Donkey Kong", "Luigi"], correct: 1 },
    
    // === 40 PREGUNTAS FINALES PARA COMPLETAR 600 ===
    { question: "¿Cuántos días tiene el mes de enero?", options: ["28", "29", "30", "31"], correct: 3 },
    { question: "¿Cuántos días tiene el mes de febrero (no bisiesto)?", options: ["28", "29", "30", "31"], correct: 0 },
    { question: "¿Cuántos días tiene el mes de marzo?", options: ["28", "29", "30", "31"], correct: 3 },
    { question: "¿Cuál es el primer mes del año?", options: ["Diciembre", "Enero", "Febrero", "Marzo"], correct: 1 },
    { question: "¿Cuál es el último mes del año?", options: ["Noviembre", "Diciembre", "Octubre", "Septiembre"], correct: 1 },
    { question: "¿En qué mes es Navidad?", options: ["Noviembre", "Diciembre", "Enero", "Octubre"], correct: 1 },
    { question: "¿En qué mes es Halloween?", options: ["Septiembre", "Octubre", "Noviembre", "Diciembre"], correct: 1 },
    { question: "¿Cuántas semanas tiene un mes aproximadamente?", options: ["2", "3", "4", "5"], correct: 2 },
    { question: "¿Qué día viene después del lunes?", options: ["Domingo", "Martes", "Miércoles", "Jueves"], correct: 1 },
    { question: "¿Qué día viene antes del sábado?", options: ["Jueves", "Viernes", "Domingo", "Lunes"], correct: 1 },
    { question: "¿Cuál es el primer día de la semana?", options: ["Sábado", "Domingo", "Lunes", "Martes"], correct: 2 },
    { question: "¿Cuál es el último día de la semana?", options: ["Sábado", "Domingo", "Viernes", "Lunes"], correct: 1 },
    { question: "¿Cuántas patas tiene un perro?", options: ["2", "3", "4", "5"], correct: 2 },
    { question: "¿Cuántas alas tiene un pájaro?", options: ["1", "2", "3", "4"], correct: 1 },
    { question: "¿Cuántas patas tiene un gato?", options: ["2", "3", "4", "5"], correct: 2 },
    { question: "¿Cuántas orejas tiene un conejo?", options: ["1", "2", "3", "4"], correct: 1 },
    { question: "¿De qué color es una cebra?", options: ["Negro", "Blanco", "Blanco y negro", "Gris"], correct: 2 },
    { question: "¿De qué color es un flamenco?", options: ["Blanco", "Rosa", "Rojo", "Naranja"], correct: 1 },
    { question: "¿De qué color es un canario?", options: ["Azul", "Amarillo", "Verde", "Rojo"], correct: 1 },
    { question: "¿Dónde viven los peces?", options: ["Tierra", "Agua", "Aire", "Árboles"], correct: 1 },
    { question: "¿Dónde viven los pájaros?", options: ["Agua", "Árboles", "Tierra", "Cuevas"], correct: 1 },
    { question: "¿Qué come un herbívoro?", options: ["Carne", "Plantas", "Ambos", "Ninguno"], correct: 1 },
    { question: "¿Qué come un carnívoro?", options: ["Plantas", "Carne", "Ambos", "Ninguno"], correct: 1 },
    { question: "¿Qué come un omnívoro?", options: ["Plantas", "Carne", "Ambos", "Ninguno"], correct: 2 },
    { question: "¿Cuál es el animal más grande del océano?", options: ["Tiburón", "Ballena azul", "Calamar gigante", "Orca"], correct: 1 },
    { question: "¿Cuál es el animal más alto del mundo?", options: ["Elefante", "Jirafa", "Oso", "Camello"], correct: 1 },
    { question: "¿Cuál es el ave más grande?", options: ["Águila", "Avestruz", "Cóndor", "Buitre"], correct: 1 },
    { question: "¿Cuál es el felino más grande?", options: ["León", "Tigre", "Leopardo", "Jaguar"], correct: 1 },
    { question: "¿Cuántos continentes hay en total?", options: ["5", "6", "7", "8"], correct: 2 },
    { question: "¿Cuántos océanos hay en total?", options: ["3", "4", "5", "6"], correct: 2 },
    { question: "¿Qué se celebra el 1 de enero?", options: ["Navidad", "Año Nuevo", "Reyes", "Carnaval"], correct: 1 },
    { question: "¿Qué se celebra el 25 de diciembre?", options: ["Año Nuevo", "Navidad", "Reyes", "Halloween"], correct: 1 },
    { question: "¿Qué se celebra el 6 de enero?", options: ["Navidad", "Año Nuevo", "Reyes Magos", "Carnaval"], correct: 2 },
    { question: "¿Qué se celebra el 14 de febrero?", options: ["Navidad", "San Valentín", "Año Nuevo", "Halloween"], correct: 1 },
    { question: "¿Qué día es el Día del Niño en muchos países?", options: ["1 de mayo", "1 de junio", "20 de noviembre", "Varía"], correct: 3 },
    { question: "¿Cuántos años tiene una década?", options: ["5", "10", "20", "50"], correct: 1 },
    { question: "¿Cuántos años tiene un siglo?", options: ["10", "50", "100", "1000"], correct: 2 },
    { question: "¿Cuántos años tiene un milenio?", options: ["100", "500", "1000", "10000"], correct: 2 },
    { question: "¿En qué año estamos?", options: ["2023", "2024", "2025", "2026"], correct: 2 },
    { question: "¿Cuántas maravillas del mundo antiguo hay?", options: ["5", "6", "7", "8"], correct: 2 }
];

// Función para seleccionar preguntas aleatorias
function getRandomQuestions(count = 10) {
    const shuffled = allQuestions.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
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
