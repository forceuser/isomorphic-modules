var postcss = require('postcss');
var autoprefixer = require('autoprefixer');
var postcssImport = require('postcss-import');
var postcssNested = require('postcss-nested');
var postcssSimpleVars = require('postcss-simple-vars');
var postcssMixins = require('postcss-mixins');
var postcssColorFunction = require("postcss-color-function");
var path = require("path");

function escapeStr( str ) {
    return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0').replace(/[\n]/g,'\\n');
}


function includeCss(css) {
    var blob = new Blob([css], {type: 'text/css'});
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.setAttribute("generated","");
    link.href = window.URL.createObjectURL(blob);
    document.head.appendChild(link);

    return css;
}

module.exports = function (enviroment){
    return function(result,filename,manager,vars){
        if(!manager.async){
            return {
                code: result.code
            };
        }else{
            return postcss([
                postcssImport({
                    async: true,
                    resolve: function(name, resolveOpts){
                       return path.resolve(path.dirname(filename),name);
                    }
                }),
                postcssColorFunction,
                postcssMixins,
                postcssSimpleVars,
                postcssNested,
                autoprefixer
            ])
            .process(result.code,{from: filename, map: {
                inline: false,
                annotation: false,
                sourcesContent: true
            }})
            .then(function(res){
                res.map = JSON.parse(res.map.toString());
                console.log("res.map.sources",res.map);
                vars.cacheDep = (res.map.sources||[]).map(function(p){
                    return path.resolve(require.main.filename,p);
                });
                
                return {
                    code: res.css,
                    map: res.map
                };    
            });
            
            //'module.exports = ('+includeCss.toString()+')("'+escapeStr()+'");'
        }
    }
};