function tenantScope(req, res, next) {
const user = req.user;
if (user && user.role !== 'super-admin') {
req.tenant = { salonId: user.salonId };
}
next();
}


module.exports = { tenantScope };