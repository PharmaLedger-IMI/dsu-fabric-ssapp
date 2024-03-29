export default {
  'PACKAGES_STORAGE_PATH': "/app/data/packages.json",
  'DATA_STORAGE_PATH': "/app/data",
  'PRODUCTS_TABLE': "products",
  'LOGS_TABLE': "logs",
  'LOGIN_LOGS_TABLE': "login_logs",
  'SERIAL_NUMBERS_LOGS_TABLE': "serial_numbers_logs",
  'PRODUCT_KEYSSI_STORAGE_TABLE': "productKeySSIs",
  'BATCHES_STORAGE_TABLE': "batches",
  'PRODUCT_DSU_MOUNT_POINT': "/gtinDSU",
  'LEAFLET_ATTACHMENT_FILE': "/leaflet.xml",
  'SMPC_ATTACHMENT_FILE': "/smpc.xml",
  "ISSUER_FILE_PATH" : "/myKeys/issuer.json",
  "WALLET_HOLDER_FILE_PATH":"/myKeys/holder.json",
  "WALLET_DID_PATH":"/myKeys/did",
  "WALLET_CREDENTIAL_FILE_PATH" : "/myKeys/credential.json",
  "SSAPP_HOLDER_FILE_PATH" : "/apps/dsu-fabric-ssapp/myKeys/holder.json",
  "SSAPP_CREDENTIAL_FILE_PATH" : "/apps/dsu-fabric-ssapp/myKeys/credential.json",
  EPI_ADMIN_GROUP: "ePI_Administration_Group",
  EPI_WRITE_GROUP: "ePI_Write_Group",
  EPI_READ_GROUP: "ePI_Read_Group",
  'DID_GROUP_MAP': {
    'ePI_Read_Group': "ePI Read Group",
    'ePI_Write_Group': "ePI Write Group",
    'ePI_Administration_Group': "ePI Administration Group",
  },
  MESSAGE_TYPES: {
    USER_LOGIN: "userLogin",
    USER_REMOVED: "userRemoved",
    RECEIVED_APPROVAL: "receivedApproval",
    DID_CREATED: "didCreated",
    ADD_MEMBER_TO_GROUP: "AddMemberToGroup"
  },
  IDENTITY_KEY: "did",
  CREDENTIAL_KEY: "credential",
  CREDENTIAL_DELETED: "deleted"
}
