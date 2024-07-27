const AWS = require('aws-sdk');


const imageUpload = async (base64) => {
    const { S3_ACCESS_KEY, S3_SECRET_ACCESS_KEY, S3_REGION, S3_BUCKET_NAME } = process.env;
    AWS.config.update({
        accessKeyId: S3_ACCESS_KEY,
        secretAccessKey: S3_SECRET_ACCESS_KEY,
        region: S3_REGION
    });
    var s3 = new AWS.S3();
    var params = {
        Bucket: S3_BUCKET_NAME,
        Body: base64,
        Key: Date.now().toString() + '.jpg',
    };

    s3.upload(params, function (err, data) {
        //handle error
        if (err) {
            console.log("Error", err);
            return err;
        }
        //success
        if (data) {
            console.log("Uploaded in:", data.Location);
            return data.Location;
        }
    });

}

module.exports = imageUpload;