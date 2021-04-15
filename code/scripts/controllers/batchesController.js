const { WebcController } = WebCardinal.controllers;
import getSharedStorage from '../services/SharedDBStorageService.js';
import constants from "../constants.js";
import utils from "../utils.js";

export default class batchesController extends WebcController {
  constructor(element, history) {
    super(element, history);
    this.setModel({});
    this.model.batches = [];
    this.storageService = getSharedStorage(this.DSUStorage);

    this.storageService.filter(constants.BATCHES_STORAGE_TABLE, "__timestamp > 0", (err, batches) => {
      batches.forEach((batch) => {
        batch.code = utils.sanitizeCode(this.generateSerializationForBatch(batch, batch.defaultSerialNumber));
        if (batch.defaultRecalledSerialNumber) {
          batch.recalledCode = this.generateSerializationForBatch(batch, batch.defaultRecalledSerialNumber);
        }
        if (batch.defaultDecommissionedSerialNumber) {
          batch.decommissionedCode = this.generateSerializationForBatch(batch, batch.defaultDecommissionedSerialNumber);
        }
        let wrongBatch = JSON.parse(JSON.stringify(batch));
        wrongBatch.defaultSerialNumber = "WRONG";
        batch.wrongCode = utils.sanitizeCode(this.generateSerializationForBatch(wrongBatch, wrongBatch.defaultSerialNumber));
        batch.formatedDate = utils.convertDateFromISOToGS1Format(batch.expiryForDisplay, "/");
        this.model.batches.push(batch);
      });
    });

    this.onTagClick("sort-data", (model, target, event) => {
      let activeSortButtons = this.element.querySelectorAll('.sort-button.active')

      if (activeSortButtons.length > 0) {
        activeSortButtons.forEach(elem => {
          if (elem !== target)
            elem.classList.remove("active");
        })
      }
      target.classList.add("active");
      let sortCriteria = JSON.parse(target.getAttribute('event-data'));
      this.model.productsForDisplay.sort(utils.sortByProperty(sortCriteria.property, sortCriteria.direction));
    })

    this.onTagClick("view-2DMatrix", (model, target, event) => {
      let eventData = JSON.parse( target.firstElementChild.innerText);
      this.model.actionModalModel = {
        title: "2DMatrix",
        batchData: eventData,
        acceptButtonText: 'Close'
      }

      this.showModalFromTemplate('modal2DMatrix', ()=>{ return} , () => { return},{model: this.model});
    });

    this.onTagClick("add-batch", () => {
      this.navigateToPageTag("add-batch");
    });

    this.onTagClick('edit-batch', (model, target, event) => {
      let eventData = target.getAttribute('event-data');
      const batchData = this.model.batches.find(element => element.batchNumber === eventData);
      this.navigateToPageTag("add-batch", {'batchData': JSON.stringify(batchData)});
    }, {capture: true});
  }

  generateSerializationForBatch(batch, serialNumber) {
    if (serialNumber === '' || typeof serialNumber === "undefined") {
      return `(01)${batch.gtin}(10)${batch.batchNumber}(17)${batch.expiry}`
    }

    return `(01)${batch.gtin}(21)${serialNumber}(10)${batch.batchNumber}(17)${batch.expiry}`;
  }
}
