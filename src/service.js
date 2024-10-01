const { parentPort } = require("worker_threads");
const { Transform } = require("stream");
const path = require("path");
const fs = require("fs");

module.exports = class Service {
  #assetsPath;
  #filesPath = {
    small: () => `${this.#getAssetsPath.call(this)}/database-small.csv`,
    big: () => `${this.#getAssetsPath.call(this)}/database.csv`,
  };
  #actions = {
    readfile: this.#readFile.bind(this),
    clearterminal: this.#clearTerminal.bind(this),
  };

  init() {
    const thisFolder = process.cwd();
    this.#assetsPath = path.join(thisFolder, "/assets");
  }

  handleAction(command, args = []) {
    if (this.#actions[command]) this.#actions[command](...args);
  }

  #clearTerminal() {
    if (parentPort) parentPort.postMessage("clearterminal")
    console.clear();
  }

  #getAssetsPath() {
    return this.#assetsPath;
  }

  #readFile(size, column, searchParam) {
    if (!this.#filesPath[size]) return;
    const filePath = this.#filesPath[size]();
    const fileSize = Math.ceil(fs.statSync(filePath).size / 1024 / 1024);
    const fileStream = fs.createReadStream(filePath);
    const transformStream = this.#createStream(column, searchParam, fileSize);
    fileStream.pipe(transformStream);
    transformStream.pipe(
      fs.createWriteStream(`${this.#assetsPath}/output.csv`)
    );
  }

  #createStream(column, searchParam, fileSize) {
    const service = this;
    return new Transform({
      construct(cb) {
        this.findOccurences = service.#findOccurrences(column, searchParam);
        this.clearTerminal = service.#clearTerminal
        this.parseContent = service.#parseContent();
        this.elapsed = service.#calcElapsed();
        this.bytesRead = 0;
        this.linesCount = 0;
        this.headers = [];
        this.makeJson;
        cb();
      },
      write(chunk, _, cb) {
        if (!chunk.length) return;
        const parsedContent = this.parseContent(chunk.toString());
        if (!this.makeJson) {
          const headers = parsedContent.shift();
          this.makeJson = service.#jsonMaker(headers);
          this.push(`${headers}\n`);
        }
        const json = this.makeJson(parsedContent);
        const filteredIndexes = this.findOccurences(json);
        const parsedContentLines = filteredIndexes.map(
          (index) => `${parsedContent[index]}\n`
        );
        this.bytesRead += chunk.length;
        const MBRead = Math.ceil(this.bytesRead / 1024 / 1024);
        this.clearTerminal()
        console.log(`${((MBRead / fileSize) * 100).toFixed(2)}%`);
        this.linesCount += parsedContentLines.length;
        parsedContentLines.forEach((line) => line && this.push(line));
        cb();
      },
      final() {
        console.log(
          `'${searchParam ?? ""}' ocurrences: ${
            this.linesCount
          } - took: ${this.elapsed()}s`
        );
      },
    });
  }

  #jsonMaker(headersString) {
    const headersArray = this.#parseColumns(headersString);
    const headerEntries = headersArray.map((value, index) => [index, value]);
    const headers = Object.fromEntries(headerEntries);
    return (lines) => {
      const json = {};
      for (const line of lines) {
        const columns = this.#parseColumns(line);
        columns.forEach((col, index) => {
          if (!json[headers[index]]) json[headers[index]] = [];
          json[headers[index]].push(col);
        });
      }
      return json;
    };
  }

  #parseColumns(line) {
    const columns = line.split(",");
    return columns.map((col) => col.trim().replaceAll(" ", "_"));
  }

  #parseContent() {
    const ENDS_WITH_LINE_BREAK = /\n$/;
    let line;
    return (chunkString) => {
      const contentString = `${line ?? ""}${chunkString}`;
      const contentLines = contentString.split("\n").filter((line) => line);
      if (!ENDS_WITH_LINE_BREAK.test(contentString)) line = contentLines.pop();
      return contentLines;
    };
  }

  #findOccurrences(column, searchParam) {
    const filter = new RegExp(searchParam, "i");
    return (json) => {
      const jsonColumn = json[column];
      const foundIndexes = [];
      for (const index in jsonColumn)
        if (jsonColumn[index] && filter.test(jsonColumn[index]))
          foundIndexes.push(index);
      return foundIndexes;
    };
  }

  #calcElapsed() {
    const start = Date.now();
    return () => ((Date.now() - start) / 1000).toFixed(2);
  }
};
