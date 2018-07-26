import blobStream from './blobStream';
import concatStream from './concatStream';

export default class Archive {
  constructor(files) {
    this.files = Array.from(files);
  }

  get name() {
    return 'Send-Archive.zip';
  }

  get type() {
    return 'send-archive';
  }

  get size() {
    return this.files.reduce((total, file) => total + file.size, 0);
  }

  get manifest() {
    return {
      files: this.files.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type
      }))
    };
  }

  get stream() {
    return concatStream(this.files.map(file => blobStream(file)));
  }
}
