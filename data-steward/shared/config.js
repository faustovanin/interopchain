require("dotenv").config();

module.exports = {
    kafkaBroker: process.env.KAFKA_BROKER,
    ipfsApi: process.env.IPFS_API
};