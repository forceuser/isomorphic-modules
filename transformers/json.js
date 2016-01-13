function removeLastBreak(str){
    str = (str||"").toString().trim();
    if(str.charAt(str.length-1) === '\n'){
        str = str.slice(0, -1)
    }
    return str;
}

module.exports = function (enviroment){
    return function(result){
    
        return {
            code: 'module.exports = '+removeLastBreak(result.code)+';'
        };
    }
};