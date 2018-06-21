const events = require('events')
const net = require('net')
const stream = require('stream')
const buffer = require('buffer').Buffer

const COMMAND = Symbol()
const OPTION = Symbol()
const SUBNEG = Symbol()
const SBNGCMD = Symbol()

const SUBEND = 240
const SUBBEG = 250
const WILL = 251
const WONT = 252
const DO = 253
const DONT = 254
const IAC = 255

class TelnetStream extends stream.Transform {
  constructor() {
    super()
    this.setEncoding('utf8')
    this.state = undefined
    this.command = undefined
  }
  _transform(chunk, encoding, callback) {
    const newchunk = buffer.alloc(chunk.length)
    let index = 0
    for (const byte of chunk) {
      const newbyte = this.handle(byte)
      if (newbyte !== undefined) {
        newchunk[index++] = newbyte
      }
    }
    this.push(newchunk)
    callback()
  }
  handle(byte) {
    switch (this.state) {
      case COMMAND:
        switch (byte) {
          case WILL:
          case WONT:
          case DO:
          case DONT:
            this.command = byte
            this.state = OPTION
            return undefined
          default:
            this.emit('command', { command: byte })
            this.command = undefined
            this.state = undefined
            return undefined
        }
      case OPTION:
        this.emit('command', { command: this.command, option: byte })
        this.command = undefined
        this.state = undefined
        return undefined
      case SUBNEG:
        this.state = undefined
        return byte
      case SBNGCMD:
        this.state = undefined
        return byte
      case undefined:
      default:
        switch (byte) {
          case IAC:
            this.state = COMMAND
            return undefined
          default:
            return byte
        }
    }
  }
}

class Telnet extends events {
  constructor(port, host) {
    super()
    this.socket = new net.Socket()
    this.out = new TelnetStream()
    this.out.addListener('data', event => this.emit('data', event))
    this.out.addListener('command', event => this.emit('command', event))
    this.socket.pipe(this.out)
    this.socket.connect(port, host)
  }
  destroy() {
    this.socket.destroy()
  }
  read() {
    return new Promise(resolve => this.once('data', data => resolve(data)))
  }
  async print() {
    process.stdout.write(await this.read())
  }
  write(data) {
    data = data instanceof Array
      ? buffer.from(data)
      : data
    return new Promise(resolve => this.socket.write(data, resolve))
  }
}

(async () => {
  const aard = new Telnet(23, 'aardwolf.org')
  aard.on('command', command => console.log(command))
  await aard.print()
  await aard.print()
  await aard.write([IAC, DO, 86])
  await aard.print()
  // await aard.write('viri\n')
  // await aard.print()
  // await aard.write('nmb344\n')
  // await aard.print()
  aard.destroy()
})()
