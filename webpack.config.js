const path = require("path");
const nodeExternals = require('webpack-node-externals');
module.exports = {
  entry: "./src/index.js",
  output: {
    path: path.join(__dirname, 'dist'),
    filename: "index.js"
  },
  target: 'node',
  mode: 'production',
  externals: [nodeExternals()],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader"
        }
      },
    ]
  },
  plugins: [ ]
};
