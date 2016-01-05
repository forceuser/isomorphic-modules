module.exports = function enviromentFilter(enviroment){
    return function(code){
        var rxRemove = new RegExp('[\\s]{0,1}[ \\t]*?\\/\\*--env\\:(?!'+ enviroment +').*?\\*\\/[\\s]*([\\s\\S]*?)(?=\\s*\\/\\*--(?:env.*?|end)\\*\\/)','gm');
        var rxUnwrap = new RegExp('\\/\\*--env\\:(?='+ enviroment +').*?\\*\\/[\\s]*([\\s\\S]*?)(\\s*\\/\\*--(?:env.*?|end)\\*\\/)','gm');
        
        code = code.replace(rxRemove,'');
        code = code.replace(rxUnwrap,'$1');
        return code;
    }
};