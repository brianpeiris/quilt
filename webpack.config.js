module.exports = {
  devtool: "eval",
  entry: {
    main: "./src/client/main.js"
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: { loader: "babel-loader" }
      }
    ]
  }
};
