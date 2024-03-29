import constants from "../constants.js";
import Batch from "../models/Batch.js";
import utils from "../utils.js";
import MessagesService from "../services/MessagesService.js";
import HolderService from "../services/HolderService.js";

const {FwController} = WebCardinal.controllers;
const holderService = HolderService.getHolderService();
const gtinResolverUtils = require("gtin-resolver").getMappingsUtils();
const mappings = require("gtin-resolver").loadApi("mappings");
const ModelMessageService = require("gtin-resolver").loadApi("services").ModelMessageService;
const gtinResolver = require("gtin-resolver");

export default class addBatchController extends FwController {
  constructor(...props) {
    super(...props);
    this.model = {disabledFeatures: this.disabledFeatures, userrights: this.userRights, languageTypeCards: []};
    let state = this.history.location.state;
    const editMode = state != null && state.batchData != null;
    const editData = editMode ? JSON.parse(state.batchData) : undefined;
    let batch = new Batch(editData);
    this.versionOffset = 1;
    this.model.batch = batch;
    // ACDC PATCH START
    this.model.hasAcdcAuthFeature = !!batch.acdcAuthFeatureSSI;
    // ACDC PATCH END

    this.model.batch.videos.defaultSource = atob(this.model.batch.videos.defaultSource);
    this.model.batch.productName = "";
    this.model.productDescription = "";
    this.model.editMode = editMode;
    this.model.serialNumbersLogs = [];
    this.model.products = {
      placeholder: "Select a product"
    }

    this.model.serial_update_options = {
      options: [
        {label: "Update Valid", value: "update-valid-serial"},
        {label: "Update Recalled", value: "update-recalled-serial"},
        {label: "Update decommissioned", value: "update-decommissioned-serial"},
        {label: "See update history", value: "update-history"}
      ],
      placeholder: "Select an option"
    }

    this.model.videoSourceUpdated = false;
    this.videoInitialDefaultSource = this.model.batch.videos.defaultSource;

    if (editMode) {

      this.gtin = this.model.batch.gtin;
      this.model.batch.version++;
      gtinResolver.DSUFabricUtils.getDSUAttachments(this.model.batch, this.disabledFeatures, (err, attachments) => {
        if (err) {
          this.showErrorModalAndRedirect("Failed to get inherited cards", "patch");
        }
        let submitButton = this.querySelector("#submit-batch");
        submitButton.disabled = true;
        this.model.languageTypeCards = attachments.languageTypeCards;
        this.model.languageTypeCardsForDisplay = attachments.languageTypeCards;
        this.initialCards = JSON.parse(JSON.stringify(this.model.languageTypeCards));
        this.initialModel = JSON.parse(JSON.stringify(this.model));
        this.model.onChange("batch", (...props) => {
          this.manageUpdateButtonState();
        })
        this.model.onChange("languageTypeCards", (...props) => {
          this.manageUpdateButtonState();
        })
      });
      this.model.batch.enableExpiryDay = this.model.batch.expiry.slice(-2) !== "00";

      this.getProductFromGtin(this.gtin, (err, product) => {
        this.model.batch.productName = product.name;
        this.model.productDescription = product.description;
      });


    }

    this.storageService.filter(this.model.batch.batchNumber, "__timestamp > 0", (err, logs) => {
      if (err || typeof logs === "undefined") {
        logs = [];
      }
      this.model.serialNumbersLogs = logs;
    });

    this.storageService.filter(constants.PRODUCTS_TABLE, "__timestamp > 0", (err, products) => {
      if (err || !products) {
        printOpenDSUError(createOpenDSUErrorWrapper("Failed to retrieve products list!", err));
        return this.showErrorModalAndRedirect("Failed to retrieve products list! Create a product first!", "products", 5000);
      }
      const options = [];
      Object.values(products).forEach(prod => options.push({
        label: prod.gtin + ' - ' + prod.name,
        value: prod.gtin
      }));
      this.model.products.options = options;
    });

    this.addEventListeners();
    utils.disableFeatures(this);
    setTimeout(() => {
      this.setUpCheckboxes();
    }, 0)

  }

  async addOrUpdateBatch(operation) {
    if (!this.model.batch.gtin) {
      return this.showErrorModal("Invalid product code. Please select a valid code");
    }
    let batch = this.initBatch();

    if (!batch.expiryForDisplay) {
      return this.showErrorModal("Invalid date");
    }
    // manage ignore date if day is not used we save it as last day of the month
    if (!batch.enableExpiryDay) {
      batch.expiryForDisplay = utils.getIgnoreDayDate(batch.expiryForDisplay)
    }
    batch.expiry = utils.convertDateToGS1Format(batch.expiryForDisplay, batch.enableExpiryDay);

    if (this.model.hasAcdcAuthFeature && !batch.acdcAuthFeatureSSI) {
      return this.showErrorModal("You have enabled Authentication Feature. Please add a value or disable it");
    }

    let error = batch.validate();

    if (error) {
      printOpenDSUError(createOpenDSUErrorWrapper("Invalid batch info ", error));
      return this.showErrorModal(error);
    }

    if (operation === "create") {
      try {
        let batchWithIdExists = await $$.promisify(this.storageService.getRecord, this.storageService)(constants.BATCHES_STORAGE_TABLE, gtinResolverUtils.getBatchMetadataPK(this.model.batch.gtin, this.model.batch.batchNumber));
        printOpenDSUError(createOpenDSUErrorWrapper("Invalid batch info ", "Batch ID is already in use"));
        return this.showErrorModal("Batch ID is already in use");
      } catch (e) {
        //do nothing just check if batch with batchId exists
      }

    }

    this.createWebcModal({
      disableExpanding: true,
      disableClosing: true,
      disableFooter: true,
      modalTitle: "Info",
      modalContent: "Saving batch..."
    });

    let message = await utils.initMessage("Batch");

    try {

      let modelMsgService = new ModelMessageService("batch");
      message.batch = modelMsgService.getMessageFromModel(batch);

      //process batch, leaflet & smpc cards

      let leafletMsg = await utils.initMessage("leaflet");
      leafletMsg.cards = [...this.model.languageTypeCards];
      leafletMsg.username = this.model.username;
      leafletMsg.code = message.batch.batch;
      leafletMsg.productCode = message.batch.productCode;
      let cardMessages = await gtinResolver.DSUFabricUtils.createEpiMessages(leafletMsg, "batch");
      let messages = [];
      if (this.batchWasUpdated()) {
        messages = [message, ...cardMessages];
      } else {
        messages = [...cardMessages]
      }

      if (!this.DSUStorage.directAccessEnabled) {
        this.DSUStorage.enableDirectAccess(async () => {
          await this.sendMessagesToProcess(messages);
        });
      } else {
        await this.sendMessagesToProcess(messages);
      }

    } catch (e) {
      this.showErrorModal(e.message);
    }
  };

  batchWasUpdated() {
    if (!this.model.editMode) {
      return true;
    }
    let serialIsUpdated = this.model.serialNumbers || this.model.recalledSerialNumbers || this.model.decommissionedSerialNumbers;
    return !(JSON.stringify(this.model.batch) === JSON.stringify(this.initialModel.batch) && !serialIsUpdated);
  }

  manageUpdateButtonState() {
    let button = this.querySelector("#submit-batch");
    if (!button) {
      return;
    }
    let serialIsUpdated = this.model.serialNumbers || this.model.recalledSerialNumbers || this.model.decommissionedSerialNumbers;
    button.disabled = JSON.stringify(this.model.languageTypeCards) === JSON.stringify(this.initialCards) && JSON.stringify(this.model.batch) === JSON.stringify(this.initialModel.batch) && !serialIsUpdated;
  }

  addEventListeners() {
    this.model.onChange("batch.batchNumber", (event) => {
      this.storageService.filter(this.model.batch.batchNumber, "__timestamp > 0", (err, logs) => {
        if (err || typeof logs === "undefined") {
          logs = [];
        }
        this.model.serialNumbersLogs = logs;
      });
    })
    this.model.onChange("hasAcdcAuthFeature", (event) => {
      if (!this.model.hasAcdcAuthFeature) {
        this.model.batch.acdcAuthFeatureSSI = "";
      }
    })
    this.onTagClick("cancel", () => {
      this.navigateToPageTag("batches");
    });
    this.onTagClick("update-batch", async () => {
      await this.addOrUpdateBatch("update");
    })
    this.onTagClick("add-batch", async () => {
      await this.addOrUpdateBatch("create");
    })

    this.model.onChange('batch.videos.defaultSource', async (...props) => {
      this.model.videoSourceUpdated = this.videoInitialDefaultSource !== this.model.batch.videos.defaultSource;
    })
    this.model.onChange("serial_update_options.value", async (event) => {
      if (this.model.serial_update_options.value === "update-history") {
        this.showSerialHistoryModal()
      } else {
        this.updateSerialsModal(this.model.serial_update_options.value);
      }
    });

    this.model.onChange("products.value", async (event) => {
      if (!this.model.products.value) {
        return
      }
      this.model.batch.gtin = this.model.products.value;
      this.getProductFromGtin(this.model.batch.gtin, (err, product) => {
        if (err) {
          printOpenDSUError(createOpenDSUErrorWrapper("Failed to get a valid product", err));
          return this.showErrorModalAndRedirect("Failed to get a valid product", "batches");
        }
        this.model.batch.gtin = product.gtin;
        this.model.batch.productName = product.name;
        this.model.productDescription = product.description || "";
        this.model.batch.product = product.keySSI
      });
    })

    this.on('openFeedback', (e) => {
      this.feedbackEmitter = e.detail;
    });
  }

  setUpCheckboxes() {
    let checkboxes = this.querySelectorAll("input[type='checkbox']");
    checkboxes.forEach(checkbox => {
      checkbox.checked = checkbox.value === "true";
    })
  }

  async sendMessagesToProcess(messageArr) {
    //process video source if any change for video fields inproduct or language card
    if (this.model.videoSourceUpdated) {
      let videoMessage = await utils.initMessage("VideoSource");
      videoMessage.videos = {
        productCode: this.model.batch.gtin,
        batch: this.model.batch.batchNumber
      }

      videoMessage.videos.source = btoa(this.model.batch.videos.defaultSource);

      let videoSources = [];
      this.model.languageTypeCards.forEach(card => {
        if (card.videoSource) {
          videoSources.push({documentType: card.type.value, lang: card.language.value, source: card.videoSource})
        }
      })
      videoMessage.videos.sources = videoSources

      messageArr.push(videoMessage);

    }

    MessagesService.processMessages(messageArr, this.storageService, async (undigestedMessages) => {
      this.hideModal();
      this.showMessageError(undigestedMessages)
    })
  }

  showMessageError(undigestedMessages) {
    let errors = [];
    if (undigestedMessages.length > 0) {
      undigestedMessages.forEach(msg => {
        if (errors.findIndex((elem) => elem.message === msg.reason.originalMessage || elem.message === msg.reason.debug_message) < 0) {
          let obj = typeof msg.reason === "object" ? msg.reason : msg.error;
          errors.push({message: obj.originalMessage || obj.debug_message});
        }
      })

      this.showModalFromTemplate("digest-messages-error-modal", () => {
        this.hideModal();
        this.navigateToPageTag("batches");
      }, () => {
      }, {model: {errors: errors}});
    } else {
      this.navigateToPageTag("batches");
    }
  }

  getProductFromGtin(gtin, callback) {
    this.storageService.addIndex(constants.PRODUCTS_TABLE, "gtin", (error) => {
      if (error) {
        printOpenDSUError(createOpenDSUErrorWrapper("Failed to get a valid product", error));
        return this.showErrorModalAndRedirect("Failed to get a valid product", "batches");
      }
      this.storageService.filter(constants.PRODUCTS_TABLE, `gtin == ${gtin}`, (err, products) => {
        if (err) {
          printOpenDSUError(createOpenDSUErrorWrapper("Failed to get a valid product", err));
          return this.showErrorModalAndRedirect("Failed to get a valid product", "batches");
        }
        let product = products[0];
        if (!product) {
          return callback(new Error(`No product found for gtin ${gtin}`));
        }
        callback(undefined, product);
      });
    })

  }

  initBatch() {
    let result = this.model.batch;
    result.serialNumbers = this.stringToArray(this.model.serialNumbers);
    result.recalledSerialNumbers = this.stringToArray(this.model.recalledSerialNumbers);
    result.decommissionedSerialNumbers = this.stringToArray(this.model.decommissionedSerialNumbers);
    return result;
  }

  //TODO move it to utils
  stringToArray(string) {
    if (typeof string === "undefined") {
      return [];
    }
    return string.split(/[ ,]+/).filter(v => v !== '')
  }

  showSerialHistoryModal() {
    this.showModalFromTemplate('serial-numbers-update-history', () => {
    }, () => {
      this.model.serial_update_options.value = "Select an option";
    }, {model: this.model});
  }

  updateSerialsModal(type) {
    this.model.actionModalModel = {
      title: "Enter serial numbers separated by comma",
      acceptButtonText: 'Accept',
      denyButtonText: 'Cancel',
      type: type,
      serialNumbers: "",
      resetAll: false,
      decommissionedType: false,
      reason: {
        options: [{label: "Lost", value: "lost"}, {label: "Stolen", value: "stolen"}, {
          label: "Damaged",
          value: "damaged"
        }],
        placeholder: "Select a reason"
      }
    }
    switch (type) {
      case "update-decommissioned-serial":
        this.model.actionModalModel.decommissionedType = true;
        this.model.actionModalModel.resetButtonLabel = "Reset all decommissioned serial numbers";
        break;
      case "update-recalled-serial":
        this.model.actionModalModel.resetButtonLabel = "Reset all recalled serial numbers";
        break;
      case "update-valid-serial":
        this.model.actionModalModel.resetButtonLabel = "Reset all valid serial numbers";
        break;
      default:
        return;
    }

    const serialNumbersLog = {}

    this.showModalFromTemplate('update-batch-serial-numbers', async () => {
      switch (type) {
        case "update-valid-serial":
          serialNumbersLog.action = "Updated valid serial numbers list";
          serialNumbersLog.creationTime = new Date().toUTCString();
          if (this.model.actionModalModel.resetAll) {
            this.model.batch.snValidReset = true;
          }
          this.model.serialNumbers = this.model.actionModalModel.serialNumbers;
          break;
        case "update-recalled-serial":
          serialNumbersLog.creationTime = new Date().toUTCString();
          serialNumbersLog.action = "Updated recalled serial numbers list";
          if (this.model.actionModalModel.resetAll) {
            this.model.batch.snRecalledReset = true;
          }
          this.model.recalledSerialNumbers = this.model.actionModalModel.serialNumbers;
          break;
        case "update-decommissioned-serial":
          serialNumbersLog.action = "Updated decommissioned serial numbers list";
          serialNumbersLog.creationTime = new Date().toUTCString();
          if (this.model.actionModalModel.resetAll) {
            this.model.batch.snDecomReset = true;
          }
          this.model.decommissionedSerialNumbers = this.model.actionModalModel.serialNumbers;
          this.model.batch.decommissionReason = this.model.actionModalModel.reason.value;
          break;
      }

      this.model.serial_update_options.value = "Select an option";
      await $$.promisify(this.storageService.addIndex.bind(this.storageService))(this.model.batch.batchNumber, "__timestamp");
      await $$.promisify(this.storageService.insertRecord.bind(this.storageService))(this.model.batch.batchNumber, serialNumbersLog.creationTime, serialNumbersLog);
      this.manageUpdateButtonState();
      return;
    }, () => {
      this.model.serial_update_options.value = "Select an option";
      return;
    }, {model: this.model});
  }

};
