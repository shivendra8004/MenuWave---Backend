const express = require("express");
const {
    createMenu,
    getVendorMenus,
    updateMenu,
    deleteMenu,
    addCategory,
    addSubcategory,
    addItem,
    deleteCategory,
    deleteSubcategory,
    deleteVendorItem,
} = require("../controllers/vendorController");
const menuRouter = express.Router();
menuRouter.post("/create", createMenu); //checked
menuRouter.get("/:vendorId/getMenu", getVendorMenus); //checked
menuRouter.put("/update/:id", updateMenu);
menuRouter.delete("/delete/:id", deleteMenu); //checked

menuRouter.post("/:menuId/createCategory", addCategory); //checked
menuRouter.delete("/:menuId/delete/:categoryId", deleteCategory);

menuRouter.post("/:menuId/:categoryId/createSubCategory", addSubcategory); //checked
menuRouter.delete("/:menuId/:categoryId/delete/:subcategoryId", deleteSubcategory);

menuRouter.post("/:menuId/createItem", addItem); //checked
menuRouter.post("/:menuId/:categoryId/createItem", addItem); //checked
menuRouter.post("/:menuId/:categoryId/:subcategoryId/createItem", addItem); //checked
menuRouter.delete("/:menuId/delete/:itemId", deleteVendorItem);
menuRouter.delete("/:menuId/:categoryId/delete/:itemId", deleteVendorItem);
menuRouter.delete("/:menuId/:categoryId/:subcategoryId/delete/:itemId", deleteVendorItem);
module.exports = menuRouter;
