module.exports = function (enviroment){
    return function(result){
        var rxRemove = new RegExp('[\\s]{0,1}[ \\t]*?\\/\\*--env\\:(?!'+ enviroment +').*?\\*\\/[\\s]*([\\s\\S]*?)(?=\\s*\\/\\*--(?:env.*?|end)\\*\\/)','gm');
        var rxUnwrap = new RegExp('\\/\\*--env\\:(?='+ enviroment +').*?\\*\\/[\\s]*([\\s\\S]*?)(\\s*\\/\\*--(?:env.*?|end)\\*\\/)','gm');
        
        return {
            code: result.code.replace(rxRemove,'').replace(rxUnwrap,'$1')
        };
    }
};