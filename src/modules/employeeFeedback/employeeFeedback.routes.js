const router = require('express').Router();
const controller = require('./employeeFeedback.controller');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../lib/rbac/requireRole');
const { clientEncryption } = require('./employeeFeedback.model');


router.use(requireAuth);
router.post('/', controller.addEmployeeFeedback);
router.get('/:employeeId',
    requireRole('admin' , 'owner' , 'super-admin' , 'barber'),
    (req,res,next)=>{
        req.filterObj = {employeeId : req.params.employeeId};
        next();
    }
    , controller.getAllFeedbacks);
router.get('/',
    requireRole('client'),
    (req,res,next)=>{
        req.filterObj = {clientId : req.user._id};
        next();
    }
    , controller.getAllFeedbacks);

    router.delete('/:feedbackId',
       controller.authorizeFeedbackOwner
        , controller.deleteFeedback);
    router.put('/:feedbackId',
       controller.authorizeFeedbackOwner
        , controller.updateFeedback);


    router.get('/:employeeId/average-rating', controller.getEmployeeAverageRating);

module.exports = router;