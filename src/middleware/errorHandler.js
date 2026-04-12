const errorHandler = (err,req,res,next)=> {
    console.log(`Error :`,err.message);
    res.status(500).json({error : "Something went wrong",message : err.message});
}
module.exports = errorHandler;