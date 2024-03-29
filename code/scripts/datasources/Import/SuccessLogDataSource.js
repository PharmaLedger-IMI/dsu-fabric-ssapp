import utils from "../../utils.js";
const {DataSource} = WebCardinal.dataSources;

export default class SuccessLogDataSource extends DataSource {
  constructor(...props) {
    const [enclvDB, ...defaultOptions] = props;
    super(...defaultOptions);
    this.itemsOnPage = 15;
    this.setPageSize(this.itemsOnPage);
    this.enclaveDB = enclvDB;
    this.importLogs = [];
    this.hasMoreLogs = false;
    this.filterResult = [];
  }

  async getPageDataAsync(startOffset, dataLengthForCurrentPage) {
    window.WebCardinal.loader.hidden = false;

    if (this.filterResult.length > 0) {
      window.WebCardinal.loader.hidden = true;
      document.querySelector(".success-messages-page-btn").hidden = true;
      return this.filterResult
    }

    let importLogs = [];
    try {
      if (this.importLogs.length > 0) {
        let moreItems = await $$.promisify(this.enclaveDB.filter)('import-logs', [`__timestamp < ${this.importLogs[this.importLogs.length - 1].__timestamp}`, 'status == success'], "dsc", this.itemsOnPage);
        if (moreItems && moreItems.length > 0 && moreItems[moreItems.length - 1].pk !== this.importLogs[this.importLogs.length - 1].pk) {
          this.importLogs = [...this.importLogs, ...moreItems,];
        }
      } else {
        this.importLogs = await $$.promisify(this.enclaveDB.filter)('import-logs', ['__timestamp > 0', 'status == success'], "dsc", this.itemsOnPage * 2);
      }
      this.importLogs.length > this.itemsOnPage ? document.querySelector(".success-messages-page-btn").hidden = false : document.querySelector(".success-messages-page-btn").hidden = true;

      importLogs = this.importLogs.slice(startOffset, startOffset + dataLengthForCurrentPage);
      this.hasMoreLogs = this.importLogs.length >= startOffset + dataLengthForCurrentPage + 1;

      if (!this.hasMoreLogs) {
        document.querySelector(".success-messages-page-btn .next-page-btn").disabled = true;
      } else {
        document.querySelector(".success-messages-page-btn .next-page-btn").disabled = false;
      }

      let now = Date.now();
      importLogs = importLogs.map(log => {
        if (log.message) {
          log.timeAgo = utils.timeAgo(log["__timestamp"])
          log.isFresh = now - log["__timestamp"] < 60 * 1000;
          log.itemMsgId = log.message.messageId;
          return log;
        }
      })
      window.WebCardinal.loader.hidden = true;
    } catch (e) {
      console.log(e);
    }
    if (!importLogs.length > 0) {
      document.querySelector(".success-messages-page-btn").style.display = "none";
    } else {
      document.querySelector(".success-messages-page-btn").style.display = "flex";
    }
    return importLogs
  }
}
