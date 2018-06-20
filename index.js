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

class Output extends stream.Transform {
  constructor() {
    super()
    this.setEncoding('utf8')
    this.state = undefined
    this.command = undefined
  }
  _transform(chunk, encoding, callback) {
    const newchunk = buffer.alloc(chunk.length)
    let index = 0
    for (let byte of chunk) {
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
            this.state = OPTION
            this.command = byte
            return undefined

          default:
            this.emit('command', { command: byte })
            return undefined
        }

      case OPTION:
        this.emit('command', { command: this.command, option: byte })
        this.state = undefined
        this.command = undefined
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

class Socket extends net.Socket {
  constructor() {
    super()
    this.out = new Output()
    this.pipe(this.out)
  }
}

const socket = new Socket()
socket.connect(23, 'aardwolf.org')
socket.out.on('data', data => {
  process.stdout.write(data)
})
socket.out.on('command', command => {
  console.log('command', command)
})
process.stdin.on('data', buffer => {
  socket.write(buffer.toString('utf8'))
})
