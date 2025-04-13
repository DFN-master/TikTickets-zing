import { messageQueue, fileQueue } from "../libs/Queue";

// Função de inicialização do sistema de filas BullMQ
// Responsável por configurar e iniciar o processamento de tarefas em background
export default async function bullMQ(app) {
  console.info("bullMQ started");

  // Inicia o processamento das filas
  await messageQueue.process();
  await fileQueue.process();

  // Adiciona tarefas de exemplo
  await messageQueue.add({ text: "Mensagem de exemplo" });
  await fileQueue.add({ file: { name: "arquivo_exemplo.txt" } });

  // Em ambiente de desenvolvimento, configura interface de administração das filas
  if (process.env.NODE_ENV !== "production") {
    setQueues(Queue.queues.map((q: any) => new BullAdapter(q.bull) as any));
    app.use("/admin/queues", bullRoute);
  }
}
