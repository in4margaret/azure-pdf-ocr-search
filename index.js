// dotenv environment variables
require('dotenv').config()
const fs = require('fs');
const path = require('path');
const convertPdfToText = require('./pdf-to-text').convertPdfToText;

try {
  fs.mkdirSync('./output');
} catch (_folderAlreadyCreated) {
}

const FILES_DIR = './sample';
const files = fs.readdirSync(FILES_DIR);
Promise.all(files.map((fileName) => {
  return convertPdfToText(path.join(FILES_DIR, fileName));
})).then((filesAsText) => {
  console.log('All done');
  console.log(filesAsText);
})

