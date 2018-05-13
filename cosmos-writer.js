var DocumentClient = require('documentdb').DocumentClient;

var host = process.env.COSMOS_ENDPOINT;
var masterKey = process.env.COSMOS_MASTER_KEY;
var client = new DocumentClient(host, { masterKey: masterKey });

const databaseDefinition = { id: "pdf-database" };
const collectionDefinition = { id: "pdf-collection" };
const databaseUrl = `dbs/${databaseDefinition.id}`;
const collectionUrl = `${databaseUrl}/colls/${collectionDefinition.id}`;

let collectionCreated = false;


const HttpStatusCodes = { NOTFOUND: 404 };

const createCached = function (func) {
    let result;

    return function () {
        if (result) {
            return result;
        }
        result = func();
        return result;
    }
}
/**
 * Get the database by ID, or create if it doesn't exist.
 * @param {string} database - The database to get or create
 */
const getDatabase = createCached(function() {
    console.log(`Getting database:\n${databaseDefinition.id}\n`);

    return new Promise((resolve, reject) => {
        client.readDatabase(databaseUrl, (err, result) => {
            if (err) {
                if (err.code == HttpStatusCodes.NOTFOUND) {
                    client.createDatabase(databaseDefinition, (err, created) => {
                        if (err) reject(err)
                        else resolve(created);
                    });
                } else {
                    reject(err);
                }
            } else {
                resolve(result);
            }
        });
    });
});

/**
 * Get the collection by ID, or create if it doesn't exist.
 */
const getCollection = createCached(function getCollection() {
    console.log(`Getting collection:\n${collectionDefinition.id}\n`);

    return new Promise((resolve, reject) => {
        client.readCollection(collectionUrl, (err, result) => {
            if (err) {
                if (err.code == HttpStatusCodes.NOTFOUND) {
                    client.createCollection(databaseUrl, collectionDefinition, (err, created) => {
                        if (err) reject(err)
                        else resolve(created);
                    });
                } else {
                    reject(err);
                }
            } else {
                resolve(result);
            }
        });
    });
});

const createPdfTextDocument = (filename, text) => {    
    let pr = Promise.resolve();
    if (!collectionCreated) {
        pr = getDatabase().then(() => {
            return getCollection();
        }).then(() => {
            collectionCreated = true;
        });
    }

    return pr.then(() => {
        return new Promise((res, rej) => {
            console.log(`Creating ${filename} in documentdb`);
            client.createDocument(collectionUrl, { id: filename, text: text }, function (err, document) {
                if (err) {return console.log(err);}
                console.log('Created Document with id: ', document.id);
                res();
            });
        })
    });
};

exports.createPdfTextDocument = createPdfTextDocument;