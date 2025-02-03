const cron = require("node-cron");
const { getFun } = require("./awsimport");
module.exports = (io, userSockets) => {
  cron.schedule("*/1 * * * *", () => {
    console.log("Running background task to process pending imports...");
    getFun(io, userSockets);
  });
};
