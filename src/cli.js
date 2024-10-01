const readline = require("readline");

module.exports = class Gui {
  #previewCommand = "";
  #actualInput = "";
  #commands = {
    c: this.#sigInt.bind(this),
    backspace: this.#backSpace.bind(this),
    return: this.#enterInput.bind(this),
    space: () => this.#writeIn.call(this, { name: " " }),
    up: this.#writePreviewCommand.bind(this),
  };

  handleData(fn) {
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    new Promise(() => {
      process.stdin.on("keypress", (_, key) => {
        const keyName = key.name;
        if (this.#commands[keyName]) return this.#commands[keyName](fn, key);
        this.#writeIn(key);
      });
    });
  }

  #sigInt(_, key) {
    if (!key.ctrl) return this.#writeIn(key);
    this.#setInputData("");
    process.exit(0);
  }

  #writeIn(key) {
    const text = key?.name ?? key.sequence;
    if (!text || text.length > 1) return;
    this.#actualInput += text;
    process.stdin.write(text);
  }
  #backSpace() {
    const inputText = this.#actualInput;
    this.#actualInput = inputText.slice(0, inputText.length - 1);
    this.#setInputData(this.#actualInput);
  }

  #enterInput(fn) {
    this.#previewCommand = this.#actualInput;
    process.stdin.write("\n");
    fn(this.#actualInput);
    this.#actualInput = "";
  }

  #writePreviewCommand() {
    this.#actualInput = this.#previewCommand;
    this.#setInputData(this.#previewCommand);
  }

  #setInputData(data) {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdin.write(data);
  }
};
