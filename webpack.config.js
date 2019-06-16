module.exports = {
  devtool: "inline-source-map",
  module: {
    rules: [
      {
        test: /\.js$/,
        use: { loader: "babel-loader" }
      }
    ]
  }
};
