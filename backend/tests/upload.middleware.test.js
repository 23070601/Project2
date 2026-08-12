const test = require('node:test');
const assert = require('node:assert/strict');
const upload = require('../src/middlewares/upload.middleware');
const { ApiError } = require('../src/shared/utils/responseWrapper');

test('upload.middleware.fileFilter allows JPG, JPEG, and PNG images', () => {
  const allowedFiles = [
    { originalname: 'image.jpg', mimetype: 'image/jpeg' },
    { originalname: 'image.jpeg', mimetype: 'image/jpeg' },
    { originalname: 'image.png', mimetype: 'image/png' },
    { originalname: 'IMAGE.PNG', mimetype: 'image/png' },
    { originalname: 'IMAGE.JPG', mimetype: 'image/jpeg' },
  ];

  for (const file of allowedFiles) {
    let cbCalled = false;
    let cbErr = null;
    let cbAllowed = false;

    upload.fileFilter({}, file, (err, allowed) => {
      cbCalled = true;
      cbErr = err;
      cbAllowed = allowed;
    });

    assert.equal(cbCalled, true, `Callback not called for ${file.originalname}`);
    assert.equal(cbErr, null, `Error returned for ${file.originalname}`);
    assert.equal(cbAllowed, true, `File not allowed: ${file.originalname}`);
  }
});

test('upload.middleware.fileFilter rejects non-image or unsupported formats', () => {
  const disallowedFiles = [
    { originalname: 'document.pdf', mimetype: 'application/pdf' },
    { originalname: 'image.webp', mimetype: 'image/webp' },
    { originalname: 'file.txt', mimetype: 'text/plain' },
    { originalname: 'malicious.exe', mimetype: 'application/x-msdownload' },
  ];

  for (const file of disallowedFiles) {
    let cbCalled = false;
    let cbErr = null;
    let cbAllowed = null;

    upload.fileFilter({}, file, (err, allowed) => {
      cbCalled = true;
      cbErr = err;
      cbAllowed = allowed;
    });

    assert.equal(cbCalled, true, `Callback not called for ${file.originalname}`);
    assert.ok(cbErr instanceof ApiError, `Expected ApiError for ${file.originalname}`);
    assert.equal(cbErr.status, 400);
    assert.equal(cbErr.message, 'Only JPG, JPEG, and PNG images are allowed');
    assert.equal(cbAllowed, false, `File allowed in error: ${file.originalname}`);
  }
});
