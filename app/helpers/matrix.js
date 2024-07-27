// import * as sdk from "matrix-js-sdk";

// const matrixClient = sdk.createClient({
//     baseUrl: 'https://matrix.restapi.run', // Replace with your Matrix server URL

// });

// export default matrixClient;

const matrix = require("matrix-js-sdk");

const matrixClient = matrix.createClient({
    baseUrl: 'https://matrix.restapi.run', // Replace with your Matrix server URL
});

module.exports = matrixClient;