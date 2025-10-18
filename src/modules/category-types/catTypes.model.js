const mongoose = require('mongoose')
const {Schema}= mongoose

const CatTypeSchema = new Schema({
    name : {type :String, required : true , unique : true},
    description : {type : String},
    image : {type : String},
    gender : {type : String , enum :['men' , 'women' , 'both']}
},{timestamps : true})

module.exports = mongoose.model('CatType', CatTypeSchema)
