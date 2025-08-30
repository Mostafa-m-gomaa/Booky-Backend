const router = require('express').Router();
const { requireAuth } = require('../../middleware/auth');
const { tenantScope } = require('../../lib/rbac/tenantScope');
const { requireRole } = require('../../lib/rbac/requireRole');
const controller = require('./service.controller');
const upload = require('../../middleware/upload');



router.use(requireAuth, tenantScope);
router.use(requireRole(['owner', 'admin']));



router.post('/', upload.array('images', 5), controller.addService);
router.put('/:id', upload.array('images', 5), controller.updateService);router.get('/', controller.getServices);
router.delete('/:id', controller.deleteService);


module.exports = router;