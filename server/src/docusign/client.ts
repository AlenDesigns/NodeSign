import jwt from "jsonwebtoken";
import axios from "axios";
import moment from "moment";
import fs from "fs";
import path from "path";

class DocusignClient {
  response_type: string;
  integration_key: string;
  scope: string;
  redirect_uri: string;
  state: string | null;

  constructor(
    response_type: string,
    client_id: string,
    scopes: Array<string>,
    redirect_uri: string,
    state?: string
  ) {
    this.response_type = response_type;
    this.integration_key = client_id;
    this.scope = scopes.join(" ");
    this.redirect_uri = redirect_uri;
    this.state = state ? state : null;
  }

  /**
   *
   * @param env build environment
   */
  getBaseAuthPath(env: string | undefined): string {
    if (env === undefined || env.toUpperCase() === "DEV") {
      return "https://account-d.docusign.com/oauth";
    }

    return "https://account.docusign.com/oauth";
  }

  /**
   * The URI of the authentication service instance to be used
   * @param env build environment
   */
  getBaseInstancePath(env: string | undefined): string {
    if (env === undefined || env.toUpperCase() === "DEV") {
      return "account-d.docusign.com";
    }

    return "account.docusign.com";
  }

  /**
   * Generate consent link
   */
  getConsentLink(): string {
    let consent_url = this.getBaseAuthPath(process.env["NODE_ENV"]) + "/auth";

    consent_url += `?response_type=${this.response_type}`;
    consent_url += `&scope=${encodeURIComponent(this.scope)}`;
    consent_url += `&client_id=${this.integration_key}`;
    consent_url += `&redirect_uri=${this.redirect_uri}`;

    if (this.state) {
      consent_url += `&state=${this.state}`;
    }

    return consent_url.toString();
  }

  /**
   * Generates json web token
   */
  generateJWT(): string {
    const privateKey = fs.readFileSync(
      path.resolve(__dirname, "private.key"),
      "utf-8"
    );

    const body = {
      iss: this.integration_key,
      sub: process.env["API_USERNAME"],
      aud: this.getBaseInstancePath(process.env["NODE_ENV"]),
      iat: moment().unix(),
      exp: moment().add(1, "hour").unix(),
      scope: this.scope,
    };

    const token = jwt.sign(body, privateKey, {
      algorithm: "RS256",
    });

    return token;
  }

  /**
   * Requests access token from docusign
   */
  getAccessToken(): Promise<string> {
    return new Promise((resolve, reject) => {
      const token = this.generateJWT();

      axios
        .post(this.getBaseAuthPath(process.env["NODE_ENV"]) + "/token", {
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: token,
        })
        .then((response) => {
          resolve(response.data.access_token);
        })
        .catch((error) => {
          reject(error.message);
        });
    });
  }

  /**
   * Get your user's base URI
   */
  getBaseURI(): Promise<any> {
    return new Promise((resolve, reject) => {
      const url: string =
        this.getBaseAuthPath(process.env["NODE_ENV"]) + "/userinfo";

      this.getAccessToken()
        .then((token) => {
          axios
            .get(url, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            })
            .then((response) => {
              const [account]: any = response.data.accounts.filter(
                (acc: any) => acc.is_default
              );
              resolve(account.base_uri);
            })
            .catch((error) => {
              reject(error);
            });
        })
        .catch((error) => {
          reject(error.message);
        });
    });
  }
}

export default DocusignClient;
