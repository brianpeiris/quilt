const fs = require("fs");
const path = require("path");
const selfsigned = require("selfsigned");

function createHTTPSConfig() {
  if (fs.existsSync(path.join(__dirname, ".certs"))) {
    const key = fs.readFileSync(path.join(__dirname, ".certs", "key.pem"));
    const cert = fs.readFileSync(path.join(__dirname, ".certs", "cert.pem"));
    return { key, cert };
  } else {
    const pems = selfsigned.generate(
      [
        {
          name: "commonName",
          value: "localhost"
        }
      ],
      {
        days: 365,
        algorithm: "sha256",
        extensions: [
          {
            name: "subjectAltName",
            altNames: [
              {
                type: 2,
                value: "localhost"
              }
            ]
          }
        ]
      }
    );

    fs.mkdirSync(path.join(__dirname, ".certs"));
    fs.writeFileSync(path.join(__dirname, ".certs", "cert.pem"), pems.cert);
    fs.writeFileSync(path.join(__dirname, ".certs", "key.pem"), pems.private);

    return {
      key: pems.private,
      cert: pems.cert
    };
  }
}
module.exports = { createHTTPSConfig };
