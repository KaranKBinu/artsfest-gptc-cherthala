const fs = require('fs');
const https = require('https');
const path = require('path');

const dir = 'public/fonts';
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

console.log("Starting download...");
const file = fs.createWriteStream("public/fonts/NotoSansMalayalam-Regular.ttf");
const url = "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansMalayalam/NotoSansMalayalam-Regular.ttf";

const request = https.get(url, function (response) {
    console.log("Response status:", response.statusCode);
    if (response.statusCode === 302 || response.statusCode === 301) {
        console.log("Redirecting to", response.headers.location);
        https.get(response.headers.location, function (response) {
            response.pipe(file);
            file.on('finish', function () {
                file.close(() => console.log("Download complete"));
            });
        });
    } else if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', function () {
            file.close(() => console.log("Download complete"));
        });
    } else {
        console.error("Failed to download. Status Code: " + response.statusCode);
        file.close();
        fs.unlinkSync("public/fonts/NotoSansMalayalam-Regular.ttf");
    }
}).on('error', function (err) {
    fs.unlink("public/fonts/NotoSansMalayalam-Regular.ttf", () => { }); // Delete the file async.
    console.error("Error downloading font: " + err.message);
});
