module.exports = class Controller {
  #useWorker = false;
  #service;
  #worker;
  #cli;

  constructor({ service, worker, cli }) {
    this.#service = service;
    this.#worker = worker;
    this.#cli = cli;
  }

  static init({ service, worker, cli }) {
    const controller = new Controller({ service, worker, cli });
    controller.init();
  }

  init() {
    this.#service.init();
    this.#worker.on("message", this.#handleWorkerMessage.bind(this));
    this.#cli.handleData(this.#handleData.bind(this));
  }

  #handleWorkerMessage(command) {
    this.#service.handleAction(command)
  }

  #handleData(data) {
    const dataInput = data.toString();
    const dataArray = dataInput.match(/^.*/)?.at(0)?.split(" ");
    if (!dataArray?.length) return;
    const [command, ...args] = dataArray;
    if (command == "useworker") {
      this.#useWorker = !this.#useWorker;
      console.log(`using worker: ${this.#useWorker}`);
      return;
    }
    if (this.#useWorker)
      return this.#worker.postMessage({ name: command, args });
    this.#service.handleAction(command, args);
  }
};
