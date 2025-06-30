// Middleware to set service provider ID for review routes
const setServiceProviderId = (req, res, next) => {
  // Allow nested routes
  if (!req.body.serviceProvider) req.body.serviceProvider = req.params.serviceProviderId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

module.exports = setServiceProviderId;
