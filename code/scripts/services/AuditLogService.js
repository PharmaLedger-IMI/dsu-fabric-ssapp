export default class AuditLogService {
  constructor(mappingLogService) {
    this.mappingLogService = mappingLogService;
  }

  async logUndigestedMessages(undigestedMessages) {
    for (let i = 0; i < undigestedMessages.length; i++) {

      let undigestedMessage = undigestedMessages[i];
      let errorStatus = undigestedMessage.error.debug_message || null;
      if (undigestedMessage.error && undigestedMessage.error.otherErrors && undigestedMessage.error.otherErrors.details.length) {
        await this.mappingLogService.logFailAction(undigestedMessage.message, undigestedMessage.error.otherErrors.details, errorStatus)
      } else {
        await this.mappingLogService.logFailAction(undigestedMessage.message, undigestedMessage.error, errorStatus)
      }
    }
    return;
  }
}
