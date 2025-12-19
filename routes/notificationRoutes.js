const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  clearAllNotifications,
} = require('../controllers/notificationController');
const { protectCustomer } = require('../middleware/auth');

// All routes require customer authentication
router.get('/', protectCustomer, getNotifications);
router.get('/unread-count', protectCustomer, getUnreadCount);
router.put('/:id/read', protectCustomer, markAsRead);
router.put('/read-all', protectCustomer, markAllAsRead);
router.delete('/:id', protectCustomer, deleteNotification);
router.delete('/', protectCustomer, clearAllNotifications);

module.exports = router;
