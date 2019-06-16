module.exports = {
  devtool: "eval-source-map",
  module: {
    rules: [
      {
        test: /\.js$/,
        use: { loader: "babel-loader" }
      }
    ]
  }
};
