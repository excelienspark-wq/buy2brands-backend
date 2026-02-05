const Product = require('../models/Product.model');
const {
    uploadProductImages,
    uploadSizeChartImage,
    deleteCloudinaryImage,
    deleteMultipleImages
} = require('../utils/imageUpload.util');

/**
 * @desc    Get all products
 * @route   GET /api/products
 * @access  Public
 */
const getAllProducts = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, search, category, brand, sortBy = '-createdAt' } = req.query;

        // Build query
        const query = { isActive: true };

        if (search) {
            query.$text = { $search: search };
        }

        if (category) {
            query.category = category;
        }

        if (brand) {
            query.brand = new RegExp(brand, 'i');
        }

        // Execute query with pagination
        const products = await Product.find(query)
            .populate('shippingStructure', 'name rules isDefault')
            .sort(sortBy)
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Product.countDocuments(query);

        res.status(200).json({
            success: true,
            count: products.length,
            total: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            data: { products }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get single product
 * @route   GET /api/products/:id
 * @access  Public
 */
const getProduct = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('shippingStructure', 'name rules isDefault');

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.status(200).json({
            success: true,
            data: { product }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Create new product
 * @route   POST /api/products
 * @access  Private/Admin
 */
const createProduct = async (req, res, next) => {
    try {
        const product = await Product.create(req.body);

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: { product }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update product
 * @route   PUT /api/products/:id
 * @access  Private/Admin
 */
const updateProduct = async (req, res, next) => {
    try {
        let product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Update fields, excluding immutable ones
        const immutableFields = ['_id', '__v', 'createdAt', 'updatedAt'];
        Object.keys(req.body).forEach(key => {
            if (!immutableFields.includes(key)) {
                product[key] = req.body[key];
            }
        });

        await product.save();


        res.status(200).json({
            success: true,
            message: 'Product updated successfully',
            data: { product }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete product
 * @route   DELETE /api/products/:id
 * @access  Private/Admin
 */
const deleteProduct = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Delete all product images from Cloudinary
        if (product.images && product.images.length > 0) {
            const publicIds = product.images.map(img => img.publicId);
            await deleteMultipleImages(publicIds).catch(err => {
                console.error('Error deleting product images:', err);
            });
        }

        // Delete size chart image if it exists
        if (product.sizeChart && product.sizeChart.imagePublicId) {
            await deleteCloudinaryImage(product.sizeChart.imagePublicId).catch(err => {
                console.error('Error deleting size chart image:', err);
            });
        }

        // Soft delete by setting isActive to false
        product.isActive = false;
        await product.save();

        res.status(200).json({
            success: true,
            message: 'Product deleted successfully'
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Search products
 * @route   GET /api/products/search
 * @access  Public
 */
const searchProducts = async (req, res, next) => {
    try {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        const products = await Product.find({
            $or: [
                { name: new RegExp(q, 'i') },
                { brand: new RegExp(q, 'i') },
                { description: new RegExp(q, 'i') }
            ],
            isActive: true
        }).limit(20);

        res.status(200).json({
            success: true,
            count: products.length,
            data: { products }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Upload product images
 * @route   POST /api/products/upload/images
 * @access  Private/Admin
 */
const uploadImages = async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No images provided'
            });
        }

        const uploadedImages = await uploadProductImages(req.files);

        res.status(200).json({
            success: true,
            message: 'Images uploaded successfully',
            data: { images: uploadedImages }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete product image
 * @route   DELETE /api/products/images/:publicId
 * @access  Private/Admin
 */
const deleteImage = async (req, res, next) => {
    try {
        const { publicId } = req.params;

        if (!publicId) {
            return res.status(400).json({
                success: false,
                message: 'Public ID is required'
            });
        }

        // Decode the publicId (it may be URL encoded)
        const decodedPublicId = decodeURIComponent(publicId);

        await deleteCloudinaryImage(decodedPublicId);

        res.status(200).json({
            success: true,
            message: 'Image deleted successfully'
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Upload size chart image
 * @route   POST /api/products/upload/size-chart
 * @access  Private/Admin
 */
const uploadSizeChart = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image provided'
            });
        }

        const uploadedImage = await uploadSizeChartImage(req.file);

        res.status(200).json({
            success: true,
            message: 'Size chart uploaded successfully',
            data: { image: uploadedImage }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Duplicate product
 * @route   POST /api/products/:id/duplicate
 * @access  Private/Admin
 */
const duplicateProduct = async (req, res, next) => {
    try {
        const originalProduct = await Product.findById(req.params.id);

        if (!originalProduct) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Create a new product object with copied data
        const productData = originalProduct.toObject();

        // Remove fields that shouldn't be copied
        delete productData._id;
        delete productData.__v;
        delete productData.createdAt;
        delete productData.updatedAt;

        // Modify fields for the duplicate
        productData.name = `${productData.name} (Copy)`;
        productData.sku = null; // Will be auto-generated by pre-save hook
        productData.averageRating = 0;
        productData.reviewCount = 0;

        // Create the new product
        const duplicatedProduct = await Product.create(productData);

        res.status(201).json({
            success: true,
            message: 'Product duplicated successfully',
            data: { product: duplicatedProduct }
        });

    } catch (error) {
        next(error);
    }
};


module.exports = {
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
};
