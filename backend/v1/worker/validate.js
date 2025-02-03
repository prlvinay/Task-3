const { parentPort } = require("worker_threads");
const Joi = require("joi");
const knex = require("knex");
const knexConfig = require("./../../knexfile");
const db = knex(knexConfig);
const { Model } = require("objection");
Model.knex(db);

const productSchema = Joi.object({
  productName: Joi.string().required(),
  status: Joi.string().valid("1", "0", "2"),
  quantity: Joi.number().integer().min(1).required(),
  unit: Joi.number().precision(2).required(),
  category: Joi.string().required(),
  vendor: Joi.string().required(),
});

async function validateAndInsertProducts(
  products,
  vendorMapping,
  categoryMapping
) {
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

  // Notify main thread once validation is complete
  parentPort.postMessage({ validProducts, invalidProducts });
}

// Listen for messages from the main thread
parentPort.on("message", async (data) => {
  const { products, vendorMapping, categoryMapping } = data;
  await validateAndInsertProducts(products, vendorMapping, categoryMapping);
});
