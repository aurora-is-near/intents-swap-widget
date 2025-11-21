module.exports = {
  launch: {
    dumpio: true,
    headless: true,
    timeout: 90000,
    args: [
      '--disable-infobars',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-gpu-sandbox',
      '--no-zygote',
      '--disable-accelerated-2d-canvas',
      '--disable-dev-shm-usage',
    ],
  },
};
