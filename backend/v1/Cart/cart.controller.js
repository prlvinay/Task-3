const { Model } = require("objection");
const knexConfig = require("./../../knexfile");
const CustomError = require("../../utils/CustomError");
const asyncErrorHandler = require("../../utils/asyncErrorHandler");
const encryptData = require("../../middlewares/encrypt");
const db = require("knex")(knexConfig);

// const createProductCart = asyncErrorHandler(async (req, res, next) => {
//   const trx = await db.transaction();
//   console.log("req.body", req.body);
//   try {
//     for (let item of req.body) {
//       const product_id = item.product_id;
//       const quantity = item.quantity;
//       const user_id = item.userid;
//       const product = await trx("products")
//         .where("product_id", product_id)
//         .first();

//       if (!product) {
//         return next(
//           CustomError(`Product with ID ${product_id} does not exist.`, 400)
//         );
//       }
//       if (product.quantity_in_stock < quantity) {
//         return next(CustomError("Insufficient quantity in stock.", 400));
//       }
//       await trx("products")
//         .where({ product_id: product_id })
//         .update({
//           quantity_in_stock: product.quantity_in_stock - quantity,
//           status: product.quantity_in_stock - quantity === 0 ? "0" : "1",
//         });
//       const cartitem = await trx("product_cards")
//         .where({ product_id: product_id, user_id: user_id })
//         .first();
//       if (cartitem) {
//         if (cartitem.status === 99) {
//           // product was previously deleted, reset status to 1
//           await trx("product_cards")
//             .where({ product_id: product_id, user_id: user_id })
//             .update({
//               quantity: cartitem.quantity + quantity,
//               status: 1, // reset status
//             });
//           console.log("Product added back to cart after being deleted.");
//         } else {
//           //  product exists,status active, update qty
//           await trx("product_cards")
//             .where({ product_id: product_id, user_id: user_id })
//             .update({
//               quantity: cartitem.quantity + quantity,
//             });
//           console.log("Product quantity updated in cart.");
//         }
//       } else {
//         await trx("product_cards").insert({
//           product_id: product_id,
//           product_name: item.product_name,
//           vendor_id: item.vendor_id,
//           vendor_name: item.vendor_name,
//           quantity: item.quantity,
//           category: item.category_name,
//           user_id: item.userid,
//           status: 1,
//         });
//       }
//       await trx.savepoint();
//       console.log("Transaction successful: Item moved to cart.");
//     }
//     await trx.commit();
//     const data = encryptData({
//       mess: "Added To Cart",
//     });
//     res.status(200).json(encryptData(data));
//   } catch (error) {
//     await trx.rollback();
//     console.error("Transaction failed:", error.message);
//     return next(CustomError("Transaction failed", 400));
//   }
// });

const createProductCart = asyncErrorHandler(async (req, res, next) => {
  const trx = await db.transaction();
  console.log("req.body", req.body);
  // console.log("req.user", req.user);
  // console.log(req.user.user_id);
  const item = req.body;
  try {
    const product_id = item.product_id;
    const quantity = item.quantity;
    const user_id = req.user.user_id;
    const product = await trx("products")
      .where("product_id", product_id)
      .first();

    if (!product) {
      return next(
        CustomError(`Product with ID ${product_id} does not exist.`, 400)
      );
    }
    if (product.quantity_in_stock < quantity) {
      return next(CustomError("Insufficient quantity in stock.", 400));
    }
    await trx("products")
      .where({ product_id: product_id })
      .update({
        quantity_in_stock: product.quantity_in_stock - quantity,
        status: product.quantity_in_stock - quantity === 0 ? "0" : "1",
      });
    const cartitem = await trx("product_cards")
      .where({ product_id: product_id, user_id: user_id })
      .first();
    if (cartitem) {
      if (cartitem.status === 99) {
        // product was previously deleted, reset status to 1
        await trx("product_cards")
          .where({ product_id: product_id, user_id: user_id })
          .update({
            quantity: cartitem.quantity + quantity,
            status: 1, // reset status
          });
        console.log("Product added back to cart after being deleted.");
      } else {
        //  product exists,status active, update qty
        await trx("product_cards")
          .where({ product_id: product_id, user_id: user_id })
          .update({
            quantity: cartitem.quantity + quantity,
          });
        console.log("Product quantity updated in cart.");
      }
    } else {
      await trx("product_cards").insert({
        product_id: product_id,
        product_name: item.product_name,
        vendor_id: item.vendor_id,
        vendor_name: item.vendor_names,
        quantity: item.quantity,
        category: item.category_name,
        user_id: req.user.user_id,
        status: 1,
      });
      await trx.savepoint();
      console.log("Transaction successful: Item moved to cart.");
    }

    await trx.commit();
    const data = encryptData({
      mess: "Added To Cart",
    });
    res.status(200).json(encryptData(data));
  } catch (error) {
    await trx.rollback();
    console.error("Transaction failed:", error.message);
    return next(CustomError("Transaction failed", 500));
  }
});

const getData = asyncErrorHandler(async (req, res, next) => {
  console.log("user_id", req.params.id);
  const user_id = req.params.id;
  console.log(user_id);
  try {
    const cardData = await db("product_cards")
      .join("products", "product_cards.product_id", "=", "products.product_id")
      .join("categories", "products.category_id", "=", "categories.category_id")
      .where("product_cards.user_id", user_id)
      .whereIn("product_cards.status", [0, 1, 2])
      .select(
        "product_cards.*",
        "products.product_image",
        "categories.category_name"
      );
    if (cardData.length === 0) {
      return res.status(404).json(
        encryptData({
          message: `No product cards found for user_id: ${user_id}`,
        })
      );
    }
    console.log(cardData);
    return res.status(200).json(
      encryptData({
        message: "Product cards fetched successfully",
        data: cardData,
      })
    );
  } catch (error) {
    console.error("Error while fetching product cards:", error);
  }
});

const deleteProductCard = async (req, res, next) => {
  const card_id = req.params.id;
  console.log(card_id);

  const trx = await db.transaction();

  try {
    const productCard = await trx("product_cards")
      .where("card_id", card_id)
      .first();

    if (!productCard) {
      return next(
        CustomError(`Product card with card_id: ${card_id} not found`, 404)
      );
    }

    const { product_id, quantity } = productCard;

    await trx("product_cards").where("card_id", card_id).update({
      status: 99,
      quantity: 0,
    });

    await trx("products")
      .where("product_id", product_id)
      .increment("quantity_in_stock", quantity);

    const product = await trx("products")
      .where("product_id", product_id)
      .first();
    const newStatus = product.quantity_in_stock > 0 ? "1" : "0";

    await trx("products").where("product_id", product_id).update({
      status: newStatus,
    });

    await trx.commit();
    console.log("completed");
    return res.status(200).json(
      encryptData({
        message: "Product card status updated to 99 and stock updated",
      })
    );
  } catch (error) {
    await trx.rollback();
    console.error("Error while updating the product card:", error);
    return next(customError("Error while updating the product card", 500));
  }
};

module.exports = { createProductCart, getData, deleteProductCard };

// const existingProductCard = await trx("product_cards")
//       .where("user_id", user_id)
//       .andWhere("product_id", product_id)
//       .andWhere("vendor_id", vendor_id)
//       .first();

//     if (existingProductCard) {
//       const updatedProductCard = await trx("product_cards")
//         .where("card_id", existingProductCard.card_id)
//         .update({
//           quantity: existingProductCard.quantity + quantity,
//           vendor_name: vendor_name,
//           status: status || existingProductCard.status,
//         });

//       // Decrement quantity in stock for the product
//       await trx("products")
//         .where({ product_id })
//         .decrement("quantity_in_stock", quantity);

//       // Update product status if necessary
//       await trx("products")
//         .where("product_id", product_id)
//         .update({
//           status: db.raw("IF(quantity_in_stock > 0, 1, 2)"),
//         });

//       await trx.commit();

//       return res.status(200).json({
//         message: "Product card updated successfully",
//         data: updatedProductCard[0],
//       });
//     } else {
//       const createdProductCard = await trx("product_cards").insert({
//         product_id,
//         quantity,
//         vendor_id,
//         vendor_name,
//         user_id,
//         product_name,
//         status: status || 1,
//       });

//       // Decrement quantity in stock for the product
//       await trx("products")
//         .where("product_id", product_id)
//         .decrement("quantity_in_stock", quantity);

//       // Update product status if necessary
//       await trx("products")
//         .where("product_id", product_id)
//         .update({
//           status: db.raw("IF(quantity_in_stock > 0, 1, 2)"),
//         });

//       await trx.commit();
//       return res.status(201).json({
//         message: "Product card created successfully",
//         data: createdProductCard[0],
//       });
//     }
//   } catch (error) {
//     await trx.rollback();
//     console.error(error);
//     return res.status(500).json({
//       message: "Error creating or updating product card",
//       error: error.message,
//     });
//   }
// };
