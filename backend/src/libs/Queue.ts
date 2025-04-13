import Queue from "bull";

const messageQueue = new Queue("messageQueue", {
  redis: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
  },
});

const fileQueue = new Queue("fileQueue", {
  redis: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
  },
});

// Processa mensagens em paralelo
messageQueue.process(5, async (job) => {
  try {
    const { data } = job;
    console.log(`Processando mensagem: ${data}`);
    // ...lógica de processamento de mensagens...
  } catch (error) {
    console.error("Erro ao processar mensagem:", error);
  }
});

// Processa arquivos grandes em paralelo
fileQueue.process(2, async (job) => {
  try {
    const { file } = job.data;
    console.log(`Processando arquivo: ${file.name}`);
    // ...lógica de processamento de arquivos...
  } catch (error) {
    console.error("Erro ao processar arquivo:", error);
  }
});

export { messageQueue, fileQueue };
