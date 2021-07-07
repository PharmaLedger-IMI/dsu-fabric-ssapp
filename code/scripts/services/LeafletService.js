import UploadTypes from "../models/UploadTypes.js";
import Languages from "../models/Languages.js";

function generateCard(inherited, type, code) {
    let card = {
        inherited: inherited,
        type: {value: type},
        language: {value: code}
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

async function createEpiMessages(data){
    let cardMessages = [];
    try{
        for (let i = 0; i < data.cards.length; i++) {
            let card = data.cards[i];

            if (!card.inherited) {

                let cardMessage = {
                    inherited: card.inherited,
                    language: card.language.value,
                    messageType: card.type.value,
                    senderId: data.username,
                    xmlFileContent: await $$.promisify(getXMLFileContent)(card.files),
                    otherFilesContent: await $$.promisify(getOtherCardFiles)(card.files)
                }
                if(data.type === "product"){
                    cardMessage.productCode = data.code;
                }else{
                    cardMessage.batchCode = data.code
                }
                cardMessages.push(cardMessage);
            }


        }
    }catch (e){
        console.log('---- err ', e);
    }

    return cardMessages;
}
export default {
    generateCard,
    createEpiMessages
}