import React, {Component} from 'react';
import blessed from 'blessed';
import { render } from 'react-blessed';
import { IAC, DO, Telnet } from './telnet'

class App extends Component {
  constructor(props) {
    super(props)
    this.state = { input: '', output: '' }
    props.screen.on('keypress', this.onInput.bind(this))
    props.telnet.on('data', this.onOutput.bind(this))
  }
  onInput(char, key) {
    switch (key.full) {
      case 'backspace': {
        this.setState(state => ({
          input: state.input.substring(0, state.input.length - 1)
        }))
        break
      }
      case 'return': {
        if (this.state.input.length > 0) {
          this.props.telnet.write(`${this.state.input}\n`)
          this.setState(state => ({
            input: '',
            output: `${state.output}${this.state.input}`
          }))
        }
        break
      }
      default: {
        this.setState(state => ({
          input: state.input + char,
        }))
      }
    }
  }
  onOutput(data) {
    this.setState(state => ({
      output: state.output + data
    }), () => {
        this.refs.box.setScrollPerc(100)
    })
  }
  render() {
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
            top="center"
            left="center"
            width="80%"
            height="80%"
            border={{ type: 'line' }}
            content={this.state.output}
          />
          <box
            bottom={0}
            width="100%"
            height={1}
            style={{ fg: 'green', bg: 'black' }}
            content={`INPUT: ${this.state.input}`}
          />
        </box>
    );
  }
}

const aard = new Telnet(23, 'achaea.com')

// aard.on('close', () => {
//   console.log('\nBye now!')
//   process.exit()
// })

// aard.on('command', command => {
//   if (command.option == 201 && command.subcmd) {
//     const subcmdbuf = buffer.from(command.subcmd)
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

