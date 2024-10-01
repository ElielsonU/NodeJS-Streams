const { parentPort } = require("worker_threads");
const Service = require("./service.js");

class ParentPortHandler {
  #service;

  constructor({ service }) {
    this.#service = service;
  }

  static init({ service }) {
    const handler = new ParentPortHandler({ service });
    handler.init();
  }

  init() {
    this.#service.init();
    parentPort.on("message", this.#onmessage.bind(this));
    parentPort.on("close", this.#close.bind(this));
  }

  #onmessage(message) {
    this.#service.handleAction(message.name, message.args)
  }

  #close() {
    process.exit(0);
  }
}

ParentPortHandler.init({
  service: new Service(),
});
