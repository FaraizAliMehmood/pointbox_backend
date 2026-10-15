const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for dev
  console.error(err);

  // MySQL duplicate key (unique constraint violation)
  if (err.code === 'ER_DUP_ENTRY') {
    error = { message: 'Resource already exists', statusCode: 400 };
  }

  // MySQL missing required field / bad enum value
  if (err.code === 'ER_NO_DEFAULT_FOR_FIELD' || err.code === 'ER_BAD_NULL_ERROR' || err.code === 'WARN_DATA_TRUNCATED') {
    error = { message: err.sqlMessage || 'Invalid data provided', statusCode: 400 };
  }

  // MySQL foreign key constraint failure
  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_ROW_IS_REFERENCED_2') {
    error = { message: 'Referenced resource not found', statusCode: 400 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
  });
};

module.exports = errorHandler;

