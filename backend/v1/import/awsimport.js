const AWS = require("aws-sdk");
const express = require("express");
const app = express();
const nodemailer = require("nodemailer");
require("dotenv").config();
const knex = require("knex");
const knexConfig = require("./../../knexfile");
const db = knex(knexConfig);
const { Model } = require("objection");
Model.knex(db);
const XLSX = require("xlsx");
const Joi = require("joi");
const CHUNK_SIZE = 100;

AWS.config.update({
  accessKeyId: process.env.AWS_KEY,
  secretAccessKey: process.env.SECRET_KEY,
  region: "ap-south-1",
});

async function getVendorMapping() {
  const vendors = await db("vendors").select("vendor_id", "vendor_name");
  const vendorMapping = vendors.reduce((acc, vendor) => {
    acc[vendor.vendor_name] = vendor.vendor_id;
    return acc;
  }, {});
  return vendorMapping;
}

async function getCategoryMapping() {
  const categories = await db("categories").select(
    "category_id",
    "category_name"
  );
  const categoryMapping = categories.reduce((acc, category) => {
    acc[category.category_name] = category.category_id;
    return acc;
  }, {});
  return categoryMapping;
}

const productSchema = Joi.object({
  productName: Joi.string().required(),
  status: Joi.string().valid("1", "0", "2"),
  quantity: Joi.number().integer().min(1).required(),
  unit: Joi.number().precision(2).required(),
  category: Joi.string().required(),
  vendor: Joi.string().required(),
});

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// const chunkArray = async (chunks, size) => {
//   const results = [];
//   for (let i = 0; i < chunks.length; i += size) {
//     const chunkGroup = chunks.slice(i, i + size);
//     const promises = chunkGroup.map((chunk) => processFile(file, chunk));
//     results.push(...(await Promise.all(promises)));
//   }
//   return results;
// };

const s3 = new AWS.S3();
const getFun = async (io, userSockets) => {
  console.log("Checking for unprocessed files...");
  try {
    const vendorMapping = await getVendorMapping();
    const categoryMapping = await getCategoryMapping();

    const filesToProcess = await db("import_files")
      .select("import_id ", "user_id", "filename", "fileurl", "status")
      .whereIn("status", ["pending"]);

    await db("import_files")
      .where("status", "pending")
      .update({ status: "processing" });

    if (filesToProcess.length === 0) {
      console.log("No unprocessed files found.");
      return;
    }

    for (const file of filesToProcess) {
      const startTime = Date.now();
      let s3FileUrl = null;
      const { import_id, user_id, filename, fileurl } = file;
      const fileContent = await download(fileurl);
      const jsonData = parseData(fileContent);
      //console.log("data", jsonData);
      const { validProducts, invalidProducts } = await validateProducts(
        jsonData,
        vendorMapping,
        categoryMapping
      );
      const valid_count = validProducts.length;
      const invalid_count = invalidProducts.length;
      console.log("valid", valid_count);
      console.log("invalid", invalid_count);
      if (validProducts.length > 0) {
        await insertProductsInChunks(
          validProducts,
          vendorMapping,
          categoryMapping
        );
      }

      if (invalidProducts.length > 0) {
        const invalidExcelBuffer = convertToExcel(invalidProducts);
        const invalidFileName = `invalid_${filename}`;
        await uploadExcelToS3(invalidExcelBuffer, invalidFileName, user_id);

        s3FileUrl = `https://akv-interns.s3.ap-south-1.amazonaws.com/vinay@AKV0793/errorfiles/${user_id}/${invalidFileName}`;
      }
      await updateImportFileStatus(
        import_id,
        s3FileUrl,
        valid_count,
        invalid_count
      );
      s3FileUrl = null;
      const status = invalid_count > 0 ? "failed" : "success";
      const user = await db("users").where("user_id", user_id).first();
      // await sendEmailNotification(user.email, status, filename);

      const notify =
        invalid_count > 0
          ? `Failed to process file ${filename}`
          : ` File ${filename} processed succssfully`;
      await db("notifications").insert({
        user_id: user_id,
        file_id: import_id,
        message: notify,
        status: "unread",
      });
      const userSocketId = userSockets[user_id];
      console.log(userSocketId, io.sockets.sockets.has(userSocketId));
      if (userSocketId && io.sockets.sockets.has(userSocketId)) {
        io.to(userSocketId).emit("fileProcessed", {
          fileId: import_id,
          status,
          message: notify,
          errorFileUrl: s3FileUrl || null,
        });
        console.log(
          ` notification sent to the user${userSocketId}  ${user_id}`
        );
      }
      const endTime = Date.now();
      console.log(
        `Time Taken to process the files ${(endTime - startTime) / 1000}`
      );
      console.log(`File ${filename} processed successfully.`);
    }
  } catch (error) {
    console.error("Error processing files:", error);
  }
};

async function insertProductsInChunks(
  products,
  vendorMapping,
  categoryMapping
) {
  const chunks = chunkArray(products, CHUNK_SIZE);
  const trx = await db.transaction();
  try {
    for (const chunk of chunks) {
      await processChunk(chunk, vendorMapping, categoryMapping, trx);
    }
    await trx.commit();
    console.log(`Valid Products Added to DB Successfully.`);
  } catch (error) {
    await trx.rollback();
    console.error("Error inserting data into product table:", error);
  }
}

async function processChunk(chunk, vendorMapping, categoryMapping, trx) {
  for (const product of chunk) {
    const { productName, category, quantity, unit, status, vendor } = product;

    const existingProduct = await trx("products")
      .where("product_name", productName)
      .first();

    let productId;

    if (existingProduct) {
      productId = existingProduct.product_id;
      await trx("products")
        .where("product_id", productId)
        .update({
          quantity_in_stock: existingProduct.quantity_in_stock + quantity,
          unit_price: unit,
          status: status,
        });
    } else {
      const [newProductId] = await trx("products").insert({
        product_name: productName,
        category_id: categoryMapping[category],
        quantity_in_stock: quantity,
        unit_price: unit,
        status: status,
      });
      productId = newProductId;
    }

    const vendorNames = vendor
      .split(",")
      .map((vendorName) => vendorName.trim());
    const vendorIds = vendorNames
      .map((vendorName) => vendorMapping[vendorName])
      .filter(Boolean);

    for (const vendorId of vendorIds) {
      const existingRelation = await trx("product_to_vendor")
        .where("product_id", productId)
        .andWhere("vendor_id", vendorId)
        .first();

      if (!existingRelation) {
        await trx("product_to_vendor").insert({
          product_id: productId,
          vendor_id: vendorId,
          status: product.status,
        });
      }
    }
  }
}

async function download(file_url) {
  const params = {
    Bucket: "akv-interns",
    Key: file_url.split("amazonaws.com/")[1],
  };
  const data = await s3.getObject(params).promise();
  return data.Body;
}

function parseData(fileContent) {
  const workbook = XLSX.read(fileContent, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet);
  return jsonData;
}

async function validateProducts(products, vendorMapping, categoryMapping) {
  const validProducts = [];
  const invalidProducts = [];

  for (const product of products) {
    product.status = product.status.toString();
    const { error, value } = productSchema.validate(product);

    if (error) {
      invalidProducts.push({
        ...product,
        error: error.details.map((detail) => detail.message).join(", "),
      });
      continue;
    }

    const categoryId = categoryMapping[value.category];
    if (!categoryId) {
      invalidProducts.push({
        ...value,
        error: `Category with name ${value.category} does not exist`,
      });
      continue;
    }

    const vendors = value.vendor.split(",");
    const invalidVendors = [];
    const vendorIds = [];
    for (const vendorName of vendors) {
      const vendorId = vendorMapping[vendorName.trim()];
      if (!vendorId) {
        invalidVendors.push(vendorName);
      } else {
        vendorIds.push(vendorId);
      }
    }

    if (invalidVendors.length > 0) {
      invalidProducts.push({
        ...value,
        error: `Vendors not found: ${invalidVendors.join(", ")}`,
      });
      continue;
    }

    validProducts.push(value);
  }

  return { validProducts, invalidProducts };
}

function convertToExcel(data) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
}

async function uploadExcelToS3(fileBuffer, filename, user_id) {
  const params = {
    Bucket: "akv-interns",
    Key: `vinay@AKV0793/errorfiles/${user_id}/${filename}`,
    Body: fileBuffer,
    ContentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };

  await s3.upload(params).promise();
  console.log(`File uploaded to S3: ${filename}`);
}

async function updateImportFileStatus(
  fileId,
  s3FileUrl,
  valid_count,
  invalid_count
) {
  try {
    await db("import_files")
      .where("import_id", fileId)
      .update({
        status: invalid_count > 0 ? "failed" : "success",
        errorurl: s3FileUrl,
        valid_count: valid_count,
        invalid_count: invalid_count,
      });
    console.log("Import file record updated with the S3 URL.");
  } catch (error) {
    console.error("Error updating import file record:", error);
  }
}

async function sendEmailNotification(userEmail, status, fileName) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "prlvinay2504@gmail.com",
        pass: "yxuucxpkchfkbvql",
      },
    });

    const mailOptions = {
      from: "prlvinay2504@gmail.com",
      to: userEmail,
      subject: `File Processing Status of ${fileName}`,
      html: `
        <h1>Your file ${fileName} processing has done</h1>
        <p>Status: ${status}</p>
        <p>We have finished processing your file. Please check your dashboard for more details.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${userEmail}`);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

module.exports = { getFun };
