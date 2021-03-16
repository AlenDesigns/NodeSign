import express from "express";
import path from "path";
import * as dotenv from "dotenv";
import jwt from "jsonwebtoken";
import DocusignClient from "./docusign/client";

dotenv.config({ path: path.join(__dirname, "../src/.env") });

const app: express.Application = express();

const port = 3000;

const client = new DocusignClient(
  "code",
  "a134851d-2017-44c8-9e65-30e176460ade",
  ["signature"],
  "http://localhost:3000/ds-callback"
);

app.get("/", (req: express.Request, res: express.Response) => {
  res.status(200).send(`Server running at port ${port}`);
});

app.get("/api/get-consent", (req: express.Request, res: express.Response) => {
  res.send(client.getConsentLink());
});

app.get("/ds-callback", (req: express.Request, res: express.Response) => {
  const authorisation_code = req.query["code"];

  client
    .getBaseURI()
    .then((baseInfo) => {
      console.log(baseInfo);
      res.send(baseInfo);
    })
    .catch((error) => {
      res.send(error);
    });
});

app.listen(port, () => {
  console.log(`Server running at port ${port}`);
});
