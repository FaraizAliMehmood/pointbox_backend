const Notification = require('../models/Notification');
const CustomerNotification = require('../models/CustomerNotification');
const Customer = require('../models/Customer');

const MOBILE_TYPES = ['mobile', 'both'];

// @desc    Get Notifications for Customer (Mobile App Format)
// @route   GET /api/notification
// @access  Private (Customer)
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const customerId = req.user.id;

    // Get customer's linked companies
    const linkedCompanies = await Customer.getLinkedCompanies(customerId);
    const linkedCompanyIds = linkedCompanies.map(l => l.company);

    // Get notifications for this customer (mobile type only)
    const notifications = await Notification.findForCustomer(customerId, linkedCompanyIds, {
      limit: parseInt(limit),
      offset: skip,
      types: MOBILE_TYPES,
    });

    // Get read status for each notification
    const notificationIds = notifications.map(n => n.id);
    const readStatusMap = {};
    for (const notificationId of notificationIds) {
      const cn = await CustomerNotification.findByCustomerAndNotification(customerId, notificationId);
      if (cn) {
        readStatusMap[notificationId] = { isRead: cn.isRead, readAt: cn.readAt };
      }
    }

    // Format notifications to match mobile app NotificationModel
    const formattedNotifications = notifications.map(notification => {
      const readStatus = readStatusMap[notification.id] || { isRead: false };

      // Parse data if it exists in the notification
      let data = notification.data ?? null;

      return {
        id: String(notification.id),
        title: notification.title,
        body: notification.message,
        data: data,
        timestamp: notification.createdAt.toISOString(),
        isRead: readStatus.isRead || false,
      };
    });

    const total = await Notification.countForCustomer(customerId, linkedCompanyIds, { types: MOBILE_TYPES });

    res.json({
      success: true,
      data: formattedNotifications,
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

// @desc    Mark Notification as Read
// @route   PUT /api/notification/:id/read
// @access  Private (Customer)
exports.markAsRead = async (req, res) => {
  try {
    const customerId = req.user.id;
    const notificationId = req.params.id;

    // Check if notification exists
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    // Update or create customer notification record
    await CustomerNotification.markReadFor(customerId, notificationId);

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: {
        id: notificationId,
        isRead: true,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Mark All Notifications as Read
// @route   PUT /api/notification/read-all
// @access  Private (Customer)
exports.markAllAsRead = async (req, res) => {
  try {
    const customerId = req.user.id;

    // Get customer's linked companies
    const linkedCompanies = await Customer.getLinkedCompanies(customerId);
    const linkedCompanyIds = linkedCompanies.map(l => l.company);

    // Get all notifications for this customer (mobile type only)
    const notifications = await Notification.findForCustomer(customerId, linkedCompanyIds, {
      limit: 1000,
      offset: 0,
      types: MOBILE_TYPES,
    });

    // Mark all as read
    for (const notification of notifications) {
      await CustomerNotification.markReadFor(customerId, notification.id);
    }

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get Unread Notification Count
// @route   GET /api/notification/unread-count
// @access  Private (Customer)
exports.getUnreadCount = async (req, res) => {
  try {
    const customerId = req.user.id;

    // Get customer's linked companies
    const linkedCompanies = await Customer.getLinkedCompanies(customerId);
    const linkedCompanyIds = linkedCompanies.map(l => l.company);

    // Get all notifications for this customer (mobile type only)
    const notifications = await Notification.findForCustomer(customerId, linkedCompanyIds, {
      limit: 1000,
      offset: 0,
      types: MOBILE_TYPES,
    });

    // Count unread notifications
    let unreadCount = 0;
    for (const notification of notifications) {
      const cn = await CustomerNotification.findByCustomerAndNotification(customerId, notification.id);
      if (!cn || !cn.isRead) {
        unreadCount += 1;
      }
    }

    res.json({
      success: true,
      data: {
        unreadCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete Notification (Remove from customer's view)
// @route   DELETE /api/notification/:id
// @access  Private (Customer)
exports.deleteNotification = async (req, res) => {
  try {
    const customerId = req.user.id;
    const notificationId = req.params.id;

    // Remove customer notification record
    await CustomerNotification.deleteByCustomerAndNotification(customerId, notificationId);

    res.json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Clear All Notifications (Remove all from customer's view)
// @route   DELETE /api/notification
// @access  Private (Customer)
exports.clearAllNotifications = async (req, res) => {
  try {
    const customerId = req.user.id;

    // Remove all customer notification records
    await CustomerNotification.deleteAllForCustomer(customerId);

    res.json({
      success: true,
      message: 'All notifications cleared',
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
