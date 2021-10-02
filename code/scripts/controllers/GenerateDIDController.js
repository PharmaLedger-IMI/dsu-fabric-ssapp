import constants from "./constants.js";
import { copyToClipboard } from "../helpers/document-utils.js";
import utils from "../utils.js";

const { WebcController } = WebCardinal.controllers;

const getUserDetails = utils.getUserDetails;

export default class GenerateDIDController extends WebcController {
  constructor(...props) {
    super(...props);

    this.showSpinner();

    this.model = {};

    const openDSU = require("opendsu");
    const w3cDID = openDSU.loadAPI("w3cdid");
    const scAPI = openDSU.loadAPI("sc");

    setTimeout(async () => {
      let did;
      try {
        did = await $$.promisify(
          this.DSUStorage.getObject.bind(this.DSUStorage)
        )(constants.WALLET_DID_PATH);
      } catch (e) {}
      if (!did) {
        const userDetails = await getUserDetails();
        const vaultDomain = await $$.promisify(scAPI.getVaultDomain)();
        did = await $$.promisify(w3cDID.createIdentity)(
          "name",
          vaultDomain,
          userDetails.username
        );
        this.model.identity = did.getIdentifier();
        await $$.promisify(
            this.DSUStorage.setObject.bind(this.DSUStorage)
        )(constants.WALLET_DID_PATH, { did: did.getIdentifier() });
      } else {
        this.model.identity = did.did;
        did = await $$.promisify(w3cDID.resolveDID)(did.did);
      }

      const credential = await $$.promisify(
        this.DSUStorage.getObject.bind(this.DSUStorage)
      )(constants.WALLET_CREDENTIAL_FILE_PATH);

      if (!credential) {
        this.authorizationStillInProgress();
        did.readMessage(async (err, message) => {
          message = JSON.parse(message);
          await $$.promisify(this.DSUStorage.setObject.bind(this.DSUStorage))(
            constants.WALLET_CREDENTIAL_FILE_PATH,
            {
              credential: message.credential,
            }
          );
          const mainDSU = await $$.promisify(scAPI.getMainDSU)();
          let env = await $$.promisify(mainDSU.readFile)("/environment.json");
          env = JSON.parse(env.toString());
          env[openDSU.constants.ENCLAVE_TYPE] = message.enclave.enclaveType;
          env[openDSU.constants.ENCLAVE_DID] = message.enclave.enclaveDID;
          env[openDSU.constants.ENCLAVE_KEY_SSI] =
            message.enclave.enclaveKeySSI;
          await $$.promisify(mainDSU.writeFile)(
            "/environment.json",
            JSON.stringify(env)
          );
          scAPI.refreshSecurityContext();

          this.authorizationIsDone()
        });
        return;
      }

      this.authorizationIsDone();
    });

    this.on("copy-text", (event) => {
      copyToClipboard(event.data);
    });
  }

  showSpinner() {
    WebCardinal.loader.hidden = false;
  }

  hideSpinner() {
    WebCardinal.loader.hidden = true;
  }

  authorizationIsDone() {
    WebCardinal.root.hidden = false;
    WebCardinal.root.disableHeader = false;
    this.hideSpinner();
    this.navigateToPageTag("home");
  }

  authorizationStillInProgress() {
    WebCardinal.root.hidden = false;
    WebCardinal.root.disableHeader = true;
    this.element.parentElement.hidden = false;
    this.hideSpinner();
  }
}
