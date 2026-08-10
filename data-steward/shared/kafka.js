const { Kafka } = require("kafkajs");

const config = require("./config");

const kafka = new Kafka({
  clientId: "data-steward",
  brokers: [config.kafkaBroker || "kafka:9092"],
  connectionTimeout: 3000,
  retry: {
    initialRetryTime: 300,
    retries: 10
  }
});

const producer = kafka.producer();

let connected = false;

async function getProducer() {
    if (!connected) {
        await producer.connect();
        connected = true;
    }
    return producer;
}

function consumer(group) {
  return kafka.consumer({ groupId: group });
}

module.exports = {
  producer,
  getProducer,
  consumer
};