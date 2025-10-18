const CatType = require('./catTypes.model');
const {asyncHandler} = require('../../utils/asyncHandler');
const handlerFactory = require('../../utils/handlerFactory');

exports.createCatType = asyncHandler(async(req,res)=>{
    const {name , description , gender} = req.body;
    const image = req.file?.path
    const newCatType = await CatType.create({name , description , image , gender})
    res.status(201).json(newCatType)
})

exports.getCatTypes = handlerFactory.getAll(CatType , 'CatType');

exports.updateCatType = asyncHandler(async(req,res)=>{
    const {name , description , gender } = req.body;
    const updated = await CatType.findByIdAndUpdate(req.params?.id , {name , description , image : req.file?.path , gender} , {new : true})
    if (!updated) return res.status(404).json({message : 'CatType not found'})
    res.json(updated)
})

exports.deleteCatType = asyncHandler(async(req,res)=>{
    const deleted = await CatType.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({message : 'CatType not found'})
    res.json({message : 'CatType deleted successfully'})
})