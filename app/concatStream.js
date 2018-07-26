class ConcatStreamController {
  constructor(streams) {
    this.streams = streams;
    this.index = 0;
    this.reader = null;
    this.nextReader();
  }

  nextReader() {
    const next = this.streams[this.index++];
    this.reader = next && next.getReader();
  }

  async pull(controller) {
    if (!this.reader) {
      return controller.close();
    }
    const data = await this.reader.read();
    if (data.done) {
      this.nextReader();
      return this.pull(controller);
    }
    controller.enqueue(data.value);
  }
}

export default function concatStream(streams) {
  return new ReadableStream(new ConcatStreamController(streams));
}
