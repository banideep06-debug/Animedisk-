const { addonBuilder } = require('stremio-addon-sdk');
const manifest = require('./manifest');
const { getCatalog } = require('./handlers/catalog');
const { getMeta } = require('./handlers/meta');
const { getStream } = require('./handlers/stream');

const builder = new addonBuilder(manifest);

// Catalog handler
builder.defineCatalogHandler(async ({ type, id, extra }) => {
  console.log(`Catalog request: type=${type}, id=${id}, skip=${extra.skip || 0}`);
  return getCatalog(type, id, extra);
});

// Meta handler
builder.defineMetaHandler(async ({ type, id }) => {
  console.log(`Meta request: type=${type}, id=${id}`);
  return getMeta(type, id);
});

// Stream handler
builder.defineStreamHandler(async ({ type, id }) => {
  console.log(`Stream request: type=${type}, id=${id}`);
  return getStream(type, id);
});

const PORT = process.env.PORT || 7000;

builder.runHTTPWithOptions({ port: PORT }, () => {
  console.log(`🚀 Animedisk Stremio Addon running on http://localhost:${PORT}`);
  console.log(`📺 Manifest: http://localhost:${PORT}/manifest.json`);
  console.log(`🔗 Install: http://localhost:${PORT}/manifest.json`);
});
