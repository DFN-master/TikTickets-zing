const { parentPort, workerData } = require("worker_threads");
const { getWbot } = require("./wbot");

(async () => {
  const { whatsappId } = workerData;
  const wbot = await getWbot(whatsappId);

  wbot.on("message", async (msg) => {
    // Processa mensagens recebidas
    parentPort.postMessage({ type: "message", data: msg });
  });

  wbot.on("media_uploaded", async (msg) => {
    // Processa uploads de mídia
    parentPort.postMessage({ type: "media", data: msg });
  });

  parentPort.postMessage({ type: "ready", whatsappId });
})();
