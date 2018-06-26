import React, {Component} from 'react';
import blessed from 'blessed';
import { render } from 'react-blessed';
import { Buffer } from 'buffer'
import { IAC, DO, Telnet } from './telnet'

class App extends Component {
  constructor(props) {
    super(props)
    this.state = { input: '', output: [], history: [], pointer: undefined }
    props.screen.on('keypress', this.onInput.bind(this))
    props.telnet.on('data', this.onOutput.bind(this))
  }
  onInput(char, key) {
    switch (key.full) {
      case 'C-l': {
        this.setState({
          output: [],
        })
      }
      case 'C-x': {
        this.setState({
          pointer: undefined,
          input: '',
        })
        break
      }
      case 'up': {
        if (this.state.history.length === 0) {
          break
        }
        if (this.state.pointer === undefined) {
          this.setState({
            pointer: this.state.history.length - 1,
            input: this.state.history[this.state.history.length - 1],
          })
          break
        }
        const pointer = Math.max(this.state.pointer - 1, 0)
        this.setState({
          pointer: pointer,
          input: this.state.history[pointer],
        })
        break
      }
      case 'down': {
        if (this.state.history.length === 0) {
          break
        }
        if (this.state.pointer === undefined) {
          this.setState({
            pointer: 0,
            input: this.state.history[0],
          })
          break
        }
        const pointer = Math.min(this.state.pointer + 1, this.state.history.length - 1)
        this.setState({
          pointer: pointer,
          input: this.state.history[pointer],
        })
        break
      }
      case 'backspace': {
        this.setState(state => ({
          input: state.input.substring(0, state.input.length - 1),
          pointer: undefined,
        }))
        break
      }
      case 'return': {
        if (this.state.input.length > 0) {
          this.props.telnet.write(`${this.state.input}\n`)
          this.setState(state => ({
            input: '',
            output: [...state.output, `${this.state.input}\n`],
            history: [...state.history, this.state.input],
            pointer: undefined,
          }))
        }
        break
      }
      default: {
        this.setState(state => ({
          input: state.input + char,
          pointer: undefined,
        }))
        break
      }
    }
  }
  onOutput(data) {
    this.setState(state => ({
      output: [...state.output, data],
    }), () => {
      this.refs.box.setScrollPerc(100)
    })
  }
  render() {
    const histlen = this.state.history.length
    const pointer = this.state.pointer !== undefined
      ? `${this.state.pointer+1}/${histlen}) `
      : ''
    const output = this.state.output.join('').replace(/[\r]/g, '');
    const input = `${pointer}${this.state.input}`
    return (
        <box
          width="100%"
          height="100%"
          style={{ fg: '#3d2516' }}
          ch="/"
        >
          <box
            ref="box"
            scrollable={true}
            mouse={true}
            top={0}
            left="center"
            width="100%"
            height="100%"
            content={`${output}${input}`}
          />
        </box>
    );
  }
}

const aard = new Telnet(23, 'aardwolf.org')

aard.on('close', () => {
  console.log('\nBye now!')
  process.exit()
})

// aard.on('command', command => {
//   if (command.option == 201 && command.subcmd) {
//     const subcmdbuf = Buffer.from(command.subcmd)
//     console.log('\ngmcp:', subcmdbuf.toString('utf8'))
//   } else {
//     console.log(command)
//   }
// })

// aard.write([
//   // IAC, DONT, 86,
//   // IAC, DONT, 85,
//   // IAC, DO, 102,
//   // IAC, DO, 200,
//   IAC, DO, 201,
//   // IAC, WILL, 102,
//   // IAC, WILL, 24,
//   // IAC, WILL, 31,
// ])

const screen = blessed.screen({
  smartCSR: true,
  terminal: 'xterm-256color',
  fullUnicode: true,
});

screen.key(['C-c'], function(ch, key) {
  process.exit()
});

render(<App screen={screen} telnet={aard} />, screen);

