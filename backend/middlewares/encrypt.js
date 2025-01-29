const crypto = require("crypto-js");
const dotenv = require("dotenv");
dotenv.config();

function encryptData(data) {
  return crypto.AES.encrypt(JSON.stringify(data),'AkriviaHCM').toString();
}
// const encryptPayload = (req, res, next) => {
//   const originalJson = res.json;

//   res.json = (body) => {
//     try {
//       const encryptedBody = encryptData(body);
//       console.log("Encrypted data: ", encryptedBody);
      
//       return originalJson.call(res, { body: encryptedBody });
//     } catch (error) {
//       console.error('Encryption error', error);
//       return res.status(500).json({ error: 'Data Encryption Failed' });
//     }
//   };

//   next();
// };

module.exports = encryptData;

