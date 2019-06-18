module.exports = {
  parser: "babel-eslint",
  env: {
    browser: true,
    node: true
  },
  plugins: ["prettier", "react"],
  rules: {
    "react/prop-types": "off",
    "prettier/prettier": "error",
    "prefer-const": "error",
    "no-use-before-define": "error",
    "no-var": "error"
  },
  extends: ["prettier", "plugin:react/recommended", "eslint:recommended"]
};
