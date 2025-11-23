// Language middleware to support multi-language
const supportedLanguages = ['en', 'ar'];

const languageMiddleware = (req, res, next) => {
  // Get language from header, query, or default to 'en'
  const lang = req.headers['accept-language']?.split(',')[0]?.split('-')[0] ||
               req.query.lang ||
               'en';

  req.language = supportedLanguages.includes(lang) ? lang : 'en';
  next();
};

module.exports = languageMiddleware;

