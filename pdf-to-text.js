const pdfjsLib = require('pdfjs-dist');
const Canvas = require('canvas');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const CognitiveServicesCredentials = require('ms-rest-azure').CognitiveServicesCredentials;
// Creating the Cognitive Services credentials
// This requires a key corresponding to the service being used (i.e. text-analytics, etc)
const credentials = new CognitiveServicesCredentials(process.env.COGNITIVE_SERVICES_CREDENTIALS);
const region = process.env.COGNITIVE_SERVICES_REGION;
const vision = require('azure-cognitiveservices-vision');
const client = new vision.ComputerVisionAPIClient(credentials, region);

class NodeCanvasFactory {
    create(width, height) {
        assert(width > 0 && height > 0, 'Invalid canvas size');
        const canvas = new Canvas(width, height);
        const context = canvas.getContext('2d');
        return {
            canvas: canvas,
            context: context,
        };
    }

    reset(canvasAndContext, width, height) {
        assert(canvasAndContext.canvas, 'Canvas is not specified');
        assert(width > 0 && height > 0, 'Invalid canvas size');
        canvasAndContext.canvas.width = width;
        canvasAndContext.canvas.height = height;
    }

    destroy(canvasAndContext) {
        assert(canvasAndContext.canvas, 'Canvas is not specified');
        // Zeroing the width and height cause Firefox to release graphics
        // resources immediately, which can greatly reduce memory consumption.
        canvasAndContext.canvas.width = 0;
        canvasAndContext.canvas.height = 0;
        canvasAndContext.canvas = null;
        canvasAndContext.context = null;
    }
}

const convertPdfToText = (pdfFilePath) => {
    // Relative path of the PDF file.
    const fileName = pdfFilePath.split(path.sep)[pdfFilePath.split(path.sep).length - 1];

    // Read the PDF file into a typed array so PDF.js can load it.
    const rawData = new Uint8Array(fs.readFileSync(pdfFilePath));

    // Load the PDF file. The `disableFontFace` and `nativeImageDecoderSupport`
    // options must be passed because Node.js has no native `@font-face` and
    // `Image` support.
    return pdfjsLib.getDocument({
        data: rawData,
        disableFontFace: true,
        nativeImageDecoderSupport: 'none',
    }).then(function (pdfDocument) {
        console.log('# PDF document loaded.');
        const { numPages } = pdfDocument;

        return Promise.all(Array.from(new Array(numPages)).map((_v, index) => {
            return pdfDocument.getPage(/*starts from 1*/index + 1).then(function (page) {
                // Render the page on a Node canvas with 200% scale.
                const viewport = page.getViewport(2.0);
                const canvasFactory = new NodeCanvasFactory();
                const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);
                const renderContext = {
                    canvasContext: canvasAndContext.context,
                    viewport: viewport,
                    canvasFactory: canvasFactory
                };

                return page.render(renderContext).then(function () {
                    // Convert the canvas to an image buffer.
                    const image = canvasAndContext.canvas.toBuffer();
                    fs.writeFileSync('./output/page' + index + 'AsImageFor' + fileName + '.png', image);
                    return image;
                });
            });
        })).then((pagesAsImages) => {
            return Promise.all(pagesAsImages.map((pageAsImage, pageIndex) => {
                // TODO: Handle Azure to many requests
                return client.recognizePrintedTextInStreamWithHttpOperationResponse(false, pageAsImage).then((response) => {
                    // TODO: possible improvement would be to sort/group lines by top of bounding box
                    const text = response.body.regions.map((region) => {
                        return region.lines.map((line) => {
                            return line.words.map((word) => { return word.text }).join(' ');;
                        }).join('\n');
                    }).join('\n');
                    return text;
                }).catch((error) => {
                    console.error('Error: ' + error);
                    throw error;
                });
            }));
        }).then((pagesAsText) => {
            return pagesAsText.join('\n');
        });
    }).then((text) => {
        fs.writeFileSync('./output/textFor' + fileName + '.txt', text);
        return text;
    });
}

exports.convertPdfToText = convertPdfToText;