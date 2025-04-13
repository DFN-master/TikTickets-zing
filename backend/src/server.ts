import WorkerManager from "./libs/WorkerManager";
import Whatsapp from "./models/Whatsapp";

(async () => {
  const connections = await Whatsapp.findAll();
  connections.forEach((connection) => {
    WorkerManager.startWorker(connection.id);
  });
})();
