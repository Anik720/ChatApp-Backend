const DeviceDetector = require('node-device-detector');
const DeviceHelper = require('node-device-detector/helper');
const ClientHints = require('node-device-detector/client-hints');

const MyDeviceDetector = (res) => {
    const detector = new DeviceDetector({
        clientIndexes: true,
        deviceIndexes: true,
        deviceAliasCode: false,
        skipBotDetection: false,
        versionTruncation: 1,
        versionTruncation: 1,
        skipBotDetection: false,
        skipDeviceDetection: false,
        skipClientHintsDetection: false,
        skipDeviceModelSanitization: false,
        skipBotDetection: false,

    });

    const clientHints = new ClientHints();
    const userAgent = res.headers['user-agent'];
    const clientHintData = clientHints.parse(res.headers);
    const result = detector.detect(userAgent, clientHintData);
    return result;
};

module.exports = MyDeviceDetector;