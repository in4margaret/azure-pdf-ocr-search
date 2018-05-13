// dotenv environment variables
require('dotenv').config()
const fs = require('fs');
const path = require('path');
const convertPdfToText = require('./pdf-to-text').convertPdfToText;
const createPdfTextDocument = require('./cosmos-writer').createPdfTextDocument;

try {
  fs.mkdirSync('./output');
} catch (_folderAlreadyCreated) {
}

const FILES_DIR = './sample';
const files = fs.readdirSync(FILES_DIR);
Promise.all(files.map((fileName) => {
  return convertPdfToText(path.join(FILES_DIR, fileName));
})).then((filesAsText) => {
  console.log('PDF to text is done');
  //console.log(filesAsText);

  return Promise.all(filesAsText.map((text, i) => {
    return createPdfTextDocument(files[i], text);
  }));
}).then(() => {
  console.log('Writing to cosmosdb is done');
}).catch((error)=>{
  console.error(error);
})

