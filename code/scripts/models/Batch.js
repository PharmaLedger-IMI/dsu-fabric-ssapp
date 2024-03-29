import Utils from "./Utils.js";

export default class Batch {
  batchNumber = "";
  expiryForDisplay;
  version = 1;
  versionLabel = "";
  serialNumbers = "";
  recalledSerialNumbers = "";
  decommissionedSerialNumbers = "";
  defaultSerialNumber = "";
  bloomFilterSerialisations = [];
  bloomFilterRecalledSerialisations = [];
  bloomFilterDecommissionedSerialisations = [];
  decommissionReason = "";
  recalled = false;
  serialCheck = false;
  incorrectDateCheck = false;
  expiredDateCheck = true;
  recalledMessage = "";
  defaultMessage = "";
  packagingSiteName = "";
  enableExpiryDay = true;
  snDecomReset = false;
  snValidReset = false;
  snRecalledReset = false;
  acfBatchCheckURL = false;
  flagEnableACFBatchCheck = false;
  videos = {
    defaultSource: ""
  };

  // ACDC PATCH START
  acdcAuthFeatureSSI = "";

  // ACDC PATCH END

  constructor(batch) {
    if (typeof batch !== undefined) {
      for (let prop in batch) {
        this[prop] = batch[prop];
      }
    }
  }

  generateViewModel() {
    return {label: this.batchNumber, value: this.batchNumber}
  }

  validate() {
    if (!this.batchNumber) {
      return 'Batch number is mandatory field';
    }

    if (!/^[A-Za-z0-9]{1,20}$/.test(this.batchNumber)) {
      return 'Batch number can contain only alphanumeric characters and a maximum length of 20';
    }

    if (!this.expiryForDisplay) {
      return 'Expiration date is a mandatory field.';
    }
    return undefined;
  }

  addSerialNumbers(arr, bloomFilterType) {
    let bf;
    switch (bloomFilterType) {
      case "validSerialNumbers":
        bf = this.getBloomFilterSerialisation(arr);
        this.bloomFilterSerialisations.push(bf.bloomFilterSerialisation());
        break
      case "recalledSerialNumbers":
        bf = this.getBloomFilterSerialisation(arr)
        this.bloomFilterRecalledSerialisations.push(bf.bloomFilterSerialisation());
        break
      case "decommissionedSerialNumbers":
        bf = this.getBloomFilterSerialisation(arr);
        this.bloomFilterDecommissionedSerialisations.push(bf.bloomFilterSerialisation());
        break
    }

  }

  getBloomFilterSerialisation(arr, bfSerialisation) {
    let crypto = require("opendsu").loadAPI("crypto");
    let bf;
    if (bfSerialisation) {
      bf = crypto.createBloomFilter(bfSerialisation);
    } else {
      bf = crypto.createBloomFilter({estimatedElementCount: arr.length, falsePositiveTolerance: 0.000001});
    }
    arr.forEach(sn => {
      bf.insert(sn);
    });
    return bf
  }
}
