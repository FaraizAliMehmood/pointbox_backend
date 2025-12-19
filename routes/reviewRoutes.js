const express = require('express');
const router = express.Router();
const {
  createReview,
  getReviews,
  getReviewById,
  getReviewsByUserId,
} = require('../controllers/reviewController');

// Public routes
router.post('/', createReview);
router.get('/', getReviews);
router.get('/:id', getReviewById);
router.get('/user/:userId', getReviewsByUserId);

module.exports = router;
