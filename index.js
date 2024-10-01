const WorkerThread = require("worker_threads");
const Controller = require("./src/controller.js");
const Service = require("./src/service.js");
const Cli = require("./src/cli.js");

Controller.init({
  service: new Service(),
  worker: new WorkerThread.Worker("./src/worker.js"),
  cli: new Cli(),
});