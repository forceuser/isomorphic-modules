var path = require('path');

module.exports = function(){
    return function(result,filename,manager,vars){
        if(result.map){
            var target = vars.mapTarget||filename;
            var src = target;
            if(target){
                target = path.basename(target);
                
                if(!result.map.sources||result.map.sources.length<2){
                    result.map.sources = [target];
                }
                result.map.file = target;
            }
            
            var map = JSON.stringify(result.map);
            var base64 = Buffer(map).toString('base64');

            var inlineMap = '\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,' + base64+'';

            return {
                code: result.code+inlineMap,
                map: result.map
            };    
        }else{
            return result;
        }
    }
};