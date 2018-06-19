const net = require('net')

const socket = new net.Socket()
socket.connect(23, 'aardwolf.org')
socket.setEncoding('latin1')
socket.on('data', args => {
  for (char of args) {
    const code = char.charCodeAt() 
    if (code > 127) {
      console.log('=>', code)
    }
    else {
      process.stdout.write(char)
    }
  }
})
