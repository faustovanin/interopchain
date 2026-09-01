const express = require("express");
require("dotenv").config();

const { LogController, LogLevel_e } = require("../shared/log-controller.js");
const logger = new LogController(process.env.LOG_LEVEL === "all" ? LogLevel_e.All : LogLevel_e.Error);

const resourceRoutes = require("./routes/resources");
const healthRoutes = require("./routes/health");

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({
    extended: true,
    limit: "50mb"
}));
app.use("/resources", resourceRoutes);
app.use("/health", healthRoutes);

app.listen(3000, () => {
    logger.logInfo("API iniciada na porta 3000");
});