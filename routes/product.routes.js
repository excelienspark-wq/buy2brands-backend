const express = require('express');
const router = express.Router();
const {
    getAllProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    duplicateProduct,
    searchProducts,
    uploadImages,
    deleteImage,
    uploadSizeChart
} = require('../controllers/product.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/admin.middleware');
const { productValidation, objectIdValidation } = require('../middleware/validator.middleware');
const { upload } = require('../config/cloudinary.config');

// Public routes
router.get('/', getAllProducts);
router.get('/search', searchProducts);
router.get('/:id', objectIdValidation, getProduct);

// Protected/Admin routes
router.post('/', protect, authorize, productValidation, createProduct);
router.post('/:id/duplicate', protect, authorize, objectIdValidation, duplicateProduct);
router.put('/:id', protect, authorize, objectIdValidation, updateProduct);
router.delete('/:id', protect, authorize, objectIdValidation, deleteProduct);

// Image upload routes (Admin only)
router.post('/upload/images', protect, authorize, upload.array('images', 10), uploadImages);
router.delete('/images/:publicId', protect, authorize, deleteImage);
router.post('/upload/size-chart', protect, authorize, upload.single('image'), uploadSizeChart);

module.exports = router;
