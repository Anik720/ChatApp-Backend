var express = require("express"),
  app = express(),
  http = require("http"),
  socketIO = require("socket.io"),
  server,
  io;

const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const mongoose = require("mongoose");


const port = process.env.PORT || 8080;

app.use(express.json());
app.use(cookieParser());


const allowedOrigins = [
  "http://192.168.14.109",
  "http://localhost:3000",
  "http://staging.microxen.com"
];

const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
// app.use(cors());

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log(err));

// Import the routes
const Routes = require("./routes");
const socket = require("./socket");

// Define the routes
app.use("/api/v1", Routes);

app.get("/", (req, res) => {
  // log the request user agent to the console
  const MyDeviceDetector = require("./app/helpers/deviceDetector");
  MyDeviceDetector(req).then((result) => {
    console.log(result);
  });
  res.send("Server is running");
});

server = http.Server(app);
server.listen(port);

io = socketIO(server);

socket(io);
