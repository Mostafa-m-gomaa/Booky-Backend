const express = require('express');
const router =   express.Router();
const { requireAuth } = require('../../middleware/auth');
const {requireRole} = require('../../lib/rbac/requireRole');
const controller = require('./catTypes.controller');
const upload = require('../../middleware/upload');

router.get('/', controller.getCatTypes);
router.use(requireAuth);
router.use(requireRole(['super-admin']));
router.post('/',upload.single('image'),  controller.createCatType);
router.patch('/:id',upload.single('image'),  controller.updateCatType);
router.delete('/:id', controller.deleteCatType);


module.exports = router;