import LeafletService from "../../services/LeafletService.js";
import Languages from "../../models/Languages.js";
import UploadTypes from "../../models/UploadTypes.js";

const {WebcController} = WebCardinal.controllers;

class LeafletController extends WebcController {

  constructor(...props) {
    super(...props);
    this.model.deletedLanguageTypeCards = [];
  }

  onReady() {
    this.onTagClick("add-language-leaflet", (event) => {
      this.addLanguageTypeFilesListener(event)
    });

    this.onTagClick("delete-language-leaflet", (model, target, event) => {
      let eventData = target.firstElementChild.innerText.split('/');
      this.model.languageTypeCards = this.model.languageTypeCards.filter(lf => {
        if (!(lf.type.value === eventData[1] && lf.language.value === eventData[0])) {
          return true
        }

        if (lf.status === LeafletService.LEAFLET_CARD_STATUS.EXISTS) {
          lf.status = LeafletService.LEAFLET_CARD_STATUS.DELETE;
          this.model.deletedLanguageTypeCards.push(lf)
        }

        return false

      });
    });
  }

  addLanguageTypeFilesListener(event) {
    const languages = {
      label: "Language",
      placeholder: "Select a language",
      options: Languages.getListAsVM()
    };
    const types = {
      label: "Type",
      placeholder: "Select a type",
      options: UploadTypes.getListAsVM()
    };
    this.model.modalData = {
      title: "Choose language and type of upload",
      acceptButtonText: 'Accept',
      denyButtonText: 'Cancel',
      languages: languages,
      types: types,
      artworkId:"",
      product: {
        language: "en",
        type: "leaflet"
      },
      fileChooser: {
        accept: "directory",
        "event-name": "uploadLeaflet",
        label: "Upload files",
        "list-files": true,
      },
      filesWereNotSelected: true,
    }
    this.on("uploadLeaflet", (event) => {
      this.model.modalData.files = event.data;
      if (this.model.modalData.files.length > 0) {
        this.model.modalData.filesWereNotSelected = false;
      }
    });

    this.showModalFromTemplate('select-language-and-type-modal', () => {
      if (this.typeAndLanguageExist(this.model.modalData.product.language, this.model.modalData.product.type)) {
        return alert('This language and type combo already exist.');
      }
      let selectedLanguage = Languages.getListAsVM().find(lang => lang.value === this.model.modalData.product.language);
      let selectedType = UploadTypes.getListAsVM().find(type => type.value === this.model.modalData.product.type);
      let card = LeafletService.generateCard(LeafletService.LEAFLET_CARD_STATUS.NEW, selectedType.value, selectedLanguage.value, this.model.modalData.files, this.model.modalData.artworkId);
      this.model.languageTypeCards.push(card);
    }, () => {
      return
    }, {model: this.model});
  }

  typeAndLanguageExist(language, type) {
    return this.model.languageTypeCards.findIndex(lf => lf.type.value === type && lf.language.value === language) !== -1;
  }

}

export default LeafletController;
