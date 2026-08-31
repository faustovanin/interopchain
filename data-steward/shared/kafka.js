const { Kafka } = require("kafkajs");
const config = require("./config");

const { LogController, LogLevel_e } = require("../log/log-controller.js");
const logger = new LogController(config.logLevel === "all" ? LogLevel_e.All : LogLevel_e.Error);

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

async function connectConsumer(group, subscriptions, serviceName) {
  let attempt = 0;
  const maxRetryDelay = 30000;

  while (true) {
    const kafkaConsumer = consumer(group);

    try {
      await kafkaConsumer.connect();
      for (const subscription of subscriptions) {
        await kafkaConsumer.subscribe(subscription);
      }
      return kafkaConsumer;
    } catch (error) {
      attempt += 1;
      const retryDelay = Math.min(1000 * (2 ** (attempt - 1)), maxRetryDelay);
      logger.logError(
        `[${serviceName}] Falha ao conectar/inscrever no Kafka (tentativa ${attempt}): ${error.message}. ` +
        `Nova tentativa em ${retryDelay} ms.`
      );

      try {
        await kafkaConsumer.disconnect();
      } catch (disconnectError) {
        logger.logError(`[${serviceName}] Falha ao desconectar consumer: ${disconnectError.message}`);
      }

      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

module.exports = {
  producer,
  getProducer,
  consumer,
  connectConsumer
};