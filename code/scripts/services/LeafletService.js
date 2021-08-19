import UploadTypes from "../models/UploadTypes.js";
import Languages from "../models/Languages.js";

const LEAFLET_CARD_STATUS = {
  NEW: "new",
  EXISTS: "exists",
  DELETE: "delete"
}

function generateCard(status, type, code, files, artworkId) {
  let card = {
    status: status,
    type: {value: type},
    language: {value: code},
    files: files,
    artworkId: artworkId,
  };
  card.type.label = UploadTypes.getLanguage(type);
  card.language.label = Languages.getLanguage(code);
  return card;
}

function getXMLFileContent(files, callback) {
  let xmlFiles = files.filter((file) => file.name.endsWith('.xml'));

  if (xmlFiles.length === 0) {
    return callback(new Error("No xml files found."))
  }
  getBase64FileContent(xmlFiles[0], callback)
}

async function getOtherCardFiles(files, callback) {
  let anyOtherFiles = files.filter((file) => !file.name.endsWith('.xml'))

  let filesContent = [];
  for (let i = 0; i < anyOtherFiles.length; i++) {
    let file = anyOtherFiles[i];
    filesContent.push({
      filename: file.name,
      fileContent: await $$.promisify(getBase64FileContent)(file)
    })
  }
  callback(undefined, filesContent);
}

function getBase64FileContent(file, callback) {
  let fileReader = new FileReader();

  fileReader.onload = function (evt) {
    let arrayBuffer = fileReader.result;
    let base64FileContent = arrayBufferToBase64(arrayBuffer);
    callback(undefined, base64FileContent);
  }

  fileReader.readAsArrayBuffer(file);
}

async function createEpiMessages(data) {
  let cardMessages = [];
  try {
    for (let i = 0; i < data.cards.length; i++) {
      let card = data.cards[i];

      if (card.status !== LEAFLET_CARD_STATUS.EXISTS) {

        let cardMessage = {
          status: card.status,
          language: card.language.value,
          messageType: card.type.value,
          senderId: data.username,
          artworkId: card.artworkId

        }
        if (card.status === LEAFLET_CARD_STATUS.DELETE) {
          cardMessage.delete = true;
        } else {
          cardMessage.xmlFileContent = await $$.promisify(getXMLFileContent)(card.files);
          cardMessage.otherFilesContent = await $$.promisify(getOtherCardFiles)(card.files);
        }

        if (data.type === "product") {
          cardMessage.productCode = data.code;
        } else {
          cardMessage.batchCode = data.code
        }
        cardMessages.push(cardMessage);
      }


    }
  } catch (e) {
    console.log('err ', e);
  }

  return cardMessages;
}

async function populateEpiCards(folderList, epiType, DSU, cardsArray) {
  for (const languageCode of folderList) {
    let leafletFiles = await $$.promisify(DSU.listFiles)(`/${epiType}/${languageCode}`);
    let artworkId = {};
    try {
      artworkId = await $$.promisify(DSU.readFile)(`/${epiType}/${languageCode}/artworkId.json`);
      artworkId = JSON.parse(artworkId);
    } catch (err) {
      artworkId.value = ""
    }
    cardsArray.push(generateCard(LEAFLET_CARD_STATUS.EXISTS, epiType, languageCode, leafletFiles, artworkId.value));
  }
}

export default {
  generateCard,
  createEpiMessages,
  populateEpiCards,
  LEAFLET_CARD_STATUS
}
