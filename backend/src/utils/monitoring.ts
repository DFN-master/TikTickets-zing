import { Gauge } from "prom-client";

const activeJobs = new Gauge({
  name: "active_jobs",
  help: "Número de jobs ativos",
});

export const monitorJob = (queue) => {
  queue.on("active", () => activeJobs.inc());
  queue.on("completed", () => activeJobs.dec());
  queue.on("failed", () => activeJobs.dec());
};
