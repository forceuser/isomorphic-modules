function escapeStr( str ) {
    return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0').replace(/[\n]/g,'\\n');
}


function includeCss(css,filename) {
    var style = document.createElement('style');
    style.innerHTML = css;
    style.id = "css:"+filename;
    style.setAttribute("generated","");
    document.head.appendChild(style);

    return css;
}

module.exports = function (enviroment){
    return function(result,filename,manager){
        if(!manager.async){
            return {
                code: 'module.exports = "'+escapeStr(result.code)+'";'
            };
        }else{
            return {
                code: 'module.exports = ('+includeCss.toString(result.code)+')("'+escapeStr(result.code)+'",module.id);'
            };
        }
    }
};