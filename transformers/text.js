function escapeStr( str ) {
    return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0').replace(/[\n]/g,'\\n');
}

module.exports = function (enviroment){
    return function(result){
    
        return {
            code: 'module.exports = "'+escapeStr(result.code)+'";'
        };
    }
};