const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const apiRoutes = require("./routes");
const notFound = require("./middlewares/notFound");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.use("/api/v1", apiRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
