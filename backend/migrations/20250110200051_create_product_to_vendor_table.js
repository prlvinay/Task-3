exports.up = function(knex) {
  return knex.schema.createTable('product_to_vendor', function(table) {
    table.increments('product_to_vendor_id').primary(); 
    table.integer('vendor_id').unsigned().references('vendor_id').inTable('vendors'); 
    table.integer('product_id').unsigned().references('product_id').inTable('products');  
    table.enum('status', ['0', '1', '2', '99']).defaultTo('0'); 
    table.timestamps(true, true);  
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('product_to_vendor');
};



// ALTER TABLE product_to_vendor
//   DROP FOREIGN KEY product_to_vendor_vendor_id_foreign,  
//   DROP FOREIGN KEY product_to_vendor_product_id_foreign; 


// ALTER TABLE product_to_vendor
//   ADD CONSTRAINT product_to_vendor_vendor_id_foreign
//   FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id)
//   ON DELETE CASCADE


//   ALTER TABLE product_to_vendor
//   ADD CONSTRAINT product_to_vendor_product_id_foreign
//   FOREIGN KEY (product_id) REFERENCES products(product_id)
//   ON DELETE CASCADE