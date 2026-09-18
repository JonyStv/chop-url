const bundledApp = require("./app.bundle.cjs");

module.exports = bundledApp.default ?? bundledApp;
