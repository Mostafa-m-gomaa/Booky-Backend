const router = require('express').Router();
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../lib/rbac/requireRole');
const controller = require('./salon.controller');
const upload = require('../../middleware/upload');


router.use(requireAuth);
router.use(requireRole(['owner', 'admin']));

router.post('/',  upload.array('images', 5), controller.createSalon);
router.get('/my', controller.getMySalons);
// الصالونات العامة (كل الناس تقدر تشوفها)
router.get('/', controller.getAllSalons);

// التفاصيل الكاملة لصالون واحد
router.get('/:id', controller.getSalonDetails);
router.put('/:id', upload.array('images', 5), controller.updateSalon);
router.delete('/:id', controller.deleteSalon);

module.exports = router;
