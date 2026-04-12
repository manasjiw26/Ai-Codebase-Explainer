const express = require('express')
const router = express.Router();
router.post('/',(req,res)=>{
    const { repoUrl } = req.body;
    if(!repoUrl){
        return res.status(400).json({error : 'RepoURL is required'});
    }
    res.status(202).json({message : 'Analysis Started',id : 'temp-id-123',repoUrl});

});
router.get('/:id',(req,res)=>
{
    const {id} = req.params;
    res.status(200).json({status :'pending',id});
});

router.delete('/:id' ,(req,res)=>{
    const {id} = req.params;
    res.status(200).json({status : 'Analysis cancelled',id});
});
module.exports = router;