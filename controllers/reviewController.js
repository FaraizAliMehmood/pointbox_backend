const Review = require('../models/Review');
const Customer = require('../models/Customer');

// @desc    Create Review
// @route   POST /api/review
// @access  Public (or Protected based on your needs)
exports.createReview = async (req, res) => {
  try {
    const { userId, ratings, review } = req.body;
    console.log(req.body);
    // Validation
    if (!userId || !ratings || !review) {
      return res.status(400).json({
        success: false,
        message: 'userId, ratings, and review are required',
      });
    }

    // Validate ratings range
    if (ratings < 1 || ratings > 5) {
      return res.status(400).json({
        success: false,
        message: 'Ratings must be between 1 and 5',
      });
    }

    // Check if user exists
    const user = await Customer.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Create review
    const newReview = await Review.create({
      userId,
      ratings,
      review: review.trim(),
    });

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: newReview,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get All Reviews
// @route   GET /api/review
// @access  Public
exports.getReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('userId', 'username email')
      .sort({ createdAt: -1 })

    const total = await Review.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      data: reviews
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Review by ID
// @route   GET /api/review/:id
// @access  Public
exports.getReviewById = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('userId', 'username email');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    res.json({
      success: true,
      data: review,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Reviews by User ID
// @route   GET /api/review/user/:userId
// @access  Public
exports.getReviewsByUserId = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const reviews = await Review.find({
      userId: req.params.userId,
      isActive: true,
    })
      .populate('userId', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments({
      userId: req.params.userId,
      isActive: true,
    });

    res.json({
      success: true,
      data: reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
