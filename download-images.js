const fs = require('fs');
const path = require('path');
const https = require('https');

const images = [
    {
        url: 'https://s3-alpha.figma.com/thumbnails/76c9a57170ea0d8dc6947f528a03233cbba21843',
        filename: 'mooyu.png'
    },
    {
        url: 'https://s3-alpha.figma.com/thumbnails/293f3d11316730b9b26d1b9cdad8981430fcf0b1',
        filename: 'icon.png'
    }
];

const downloadImage = (url, filename) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(path.join(__dirname, 'images', filename));
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(filename, () => {});
            reject(err);
        });
    });
};

const downloadAllImages = async () => {
    if (!fs.existsSync(path.join(__dirname, 'images'))) {
        fs.mkdirSync(path.join(__dirname, 'images'));
    }

    for (const image of images) {
        try {
            await downloadImage(image.url, image.filename);
            console.log(`Downloaded ${image.filename}`);
        } catch (error) {
            console.error(`Error downloading ${image.filename}:`, error);
        }
    }
};

downloadAllImages(); 