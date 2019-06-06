const { createHTTPSConfig } = require("./utils.js");
const https = require("https");
const express = require("express");
const fetch = require("node-fetch");
const ogs = require("open-graph-scraper");

const app = express();
const port = 3000;

app.get("/proxy/:url", async (req, res) => {
  const { url } = req.params;
  const type = await fetch(url, { method: "HEAD" }).then(r => r.headers.get("content-type"));
  if (type.startsWith("text/html")) {
    try {
      const og = await ogs({ url });
      const { ogImage } = og.data;
      if (ogImage.url) {
        fetch(ogImage.url).then(r => r.body.pipe(res));
      } else {
        res.status(404).end();
      }
    } catch (e) {
      console.error(e);
    }
  } else {
    fetch(req.params.url).then(r => r.body.pipe(res));
  }
});

app.use(express.static("./src/client/"));

https.createServer(createHTTPSConfig(), app).listen(port, () => console.log(`Listening on port ${port}!`));
