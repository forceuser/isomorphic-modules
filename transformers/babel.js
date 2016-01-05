var babel = require('babel-core');

module.exports = function(options){
    return function(code){
        return babel.transform(code, options).code;
    }
}