const express = require("express");
require("dotenv").config();

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
    console.log("API iniciada na porta 3000");
});