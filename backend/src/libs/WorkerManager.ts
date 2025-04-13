import { Worker } from "worker_threads";
import path from "path";

class WorkerManager {
  private workers: Map<number, Worker> = new Map();

  startWorker(whatsappId: number) {
    const worker = new Worker(path.resolve(__dirname, "WhatsAppWorker.js"), {
      workerData: { whatsappId },
    });

    worker.on("message", (message) => {
      console.log(`Mensagem do worker ${whatsappId}:`, message);
    });

    worker.on("error", (error) => {
      console.error(`Erro no worker ${whatsappId}:`, error);
    });

    worker.on("exit", (code) => {
      console.log(`Worker ${whatsappId} finalizado com código ${code}`);
      this.workers.delete(whatsappId);
    });

    this.workers.set(whatsappId, worker);
  }

  stopWorker(whatsappId: number) {
    const worker = this.workers.get(whatsappId);
    if (worker) {
      worker.terminate();
      this.workers.delete(whatsappId);
    }
  }
}

export default new WorkerManager();
