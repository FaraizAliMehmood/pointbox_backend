const Notification = require('../models/Notification');
const CustomerNotification = require('../models/CustomerNotification');
const Customer = require('../models/Customer');

// @desc    Get Notifications for Customer (Mobile App Format)
// @route   GET /api/notification
// @access  Private (Customer)
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const customerId = req.user._id;

    // Get customer with linked companies
    const customer = await Customer.findById(customerId).select('linkedCompanies.company');
    const linkedCompanyIds = customer.linkedCompanies.map(l => l.company);

    // Build query conditions for notifications
    const queryConditions = [
      { target: 'all', isActive: true },
      { target: 'customers', isActive: true },
      { target: 'specific', targetIds: customerId, isActive: true },
    ];

    // Add company condition if customer has linked companies
    if (linkedCompanyIds.length > 0) {
      queryConditions.push({
        target: 'company',
        company: { $in: linkedCompanyIds },
        isActive: true,
      });
    }

    // Get notifications for this customer (mobile type only)
    const notifications = await Notification.find({
      $and: [
        { $or: queryConditions },
        { $or: [{ type: 'mobile' }, { type: 'both' }] },
      ],
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get read status for each notification
    const notificationIds = notifications.map(n => n._id);
    const customerNotifications = await CustomerNotification.find({
      customer: customerId,
      notification: { $in: notificationIds },
    });

    // Create a map of notification ID to read status
    const readStatusMap = {};
    customerNotifications.forEach(cn => {
      readStatusMap[cn.notification.toString()] = {
        isRead: cn.isRead,
        readAt: cn.readAt,
      };
    });

    // Format notifications to match mobile app NotificationModel
    const formattedNotifications = notifications.map(notification => {
      const readStatus = readStatusMap[notification._id.toString()] || { isRead: false };
      
      // Parse data if it exists in the notification
      let data = null;
      if (notification.data) {
        try {
          data = typeof notification.data === 'string' 
            ? JSON.parse(notification.data) 
            : notification.data;
        } catch (e) {
          data = notification.data;
        }
      }

      return {
        id: notification._id.toString(),
        title: notification.title,
        body: notification.message,
        data: data,
        timestamp: notification.createdAt.toISOString(),
        isRead: readStatus.isRead || false,
      };
    });

    const total = await Notification.countDocuments({
      $and: [
        { $or: queryConditions },
        { $or: [{ type: 'mobile' }, { type: 'both' }] },
      ],
    });

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
    const customerId = req.user._id;
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
    const customerNotification = await CustomerNotification.findOneAndUpdate(
      {
        customer: customerId,
        notification: notificationId,
      },
      {
        customer: customerId,
        notification: notificationId,
        isRead: true,
        readAt: new Date(),
      },
      {
        upsert: true,
        new: true,
      }
    );

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
    const customerId = req.user._id;

    // Get customer with linked companies
    const customer = await Customer.findById(customerId).select('linkedCompanies.company');
    const linkedCompanyIds = customer.linkedCompanies.map(l => l.company);

    // Build query conditions
    const queryConditions = [
      { target: 'all', isActive: true },
      { target: 'customers', isActive: true },
      { target: 'specific', targetIds: customerId, isActive: true },
    ];

    if (linkedCompanyIds.length > 0) {
      queryConditions.push({
        target: 'company',
        company: { $in: linkedCompanyIds },
        isActive: true,
      });
    }

    // Get all notifications for this customer (mobile type only)
    const notifications = await Notification.find({
      $and: [
        { $or: queryConditions },
        { $or: [{ type: 'mobile' }, { type: 'both' }] },
      ],
    });

    const notificationIds = notifications.map(n => n._id);

    // Mark all as read
    await CustomerNotification.updateMany(
      {
        customer: customerId,
        notification: { $in: notificationIds },
      },
      {
        isRead: true,
        readAt: new Date(),
      },
      { upsert: true }
    );

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
    const customerId = req.user._id;

    // Get customer with linked companies
    const customer = await Customer.findById(customerId).select('linkedCompanies.company');
    const linkedCompanyIds = customer.linkedCompanies.map(l => l.company);

    // Build query conditions
    const queryConditions = [
      { target: 'all', isActive: true },
      { target: 'customers', isActive: true },
      { target: 'specific', targetIds: customerId, isActive: true },
    ];

    if (linkedCompanyIds.length > 0) {
      queryConditions.push({
        target: 'company',
        company: { $in: linkedCompanyIds },
        isActive: true,
      });
    }

    // Get all notifications for this customer (mobile type only)
    const notifications = await Notification.find({
      $and: [
        { $or: queryConditions },
        { $or: [{ type: 'mobile' }, { type: 'both' }] },
      ],
    });

    const notificationIds = notifications.map(n => n._id);

    // Count unread notifications
    const readNotificationIds = await CustomerNotification.find({
      customer: customerId,
      notification: { $in: notificationIds },
      isRead: true,
    }).select('notification');

    const readIds = readNotificationIds.map(rn => rn.notification.toString());
    const unreadCount = notificationIds.filter(
      id => !readIds.includes(id.toString())
    ).length;

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
    const customerId = req.user._id;
    const notificationId = req.params.id;

    // Remove customer notification record
    await CustomerNotification.findOneAndDelete({
      customer: customerId,
      notification: notificationId,
    });

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
    const customerId = req.user._id;

    // Remove all customer notification records
    await CustomerNotification.deleteMany({
      customer: customerId,
    });

    res.json({
      success: true,
      message: 'All notifications cleared',
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
