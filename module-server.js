var resolve = require("resolve");
var path = require('path');
var fs = require('fs');
var mime = require('mime');
var babel = require("babel-core");
var enviromentTransformer = require("./transformers/enviroment");

function wrapSource(content,id,filename){
    return content+'\n//# moduleInfo={"id": "'+id+'","filename": "'+filename+'"}';
}

function wrapJson(content,id,filename){
    return wrapSource('module.exports = '+content.toString().trim()+';',id,filename);
}

function resolveModule(mpath,basedir){
    var parent = '';
    var mpath = '/'+mpath;
    
    if(~mpath.indexOf('/~/')){
        var parts = mpath.split('/~/')
        parent = '.'+parts[0]||'';
        mpath = parts[1]||'';
    }else{
        mpath = '.'+mpath;
    }
    
    var fullPath, parentPath;
    try{
        
        // использовать packageFilter в resolve.sync для замены main на browser если необходимо
        if(parent){
            if(parent.match(/\//)){
                parentPath = parent.replace(/(\.[^\.\/]+)$/,'');
            }else{
                parentPath = resolve.sync(parent.replace(/(\.[^\.\/]+)$/,''),{basedir: basedir,extensions:['.js','.json'],paths:[basedir]});
                parentPath = parentPath.replace(/^(.*)(node_modules\/.*?)(\/.*?)$/,"$1$2");
            }
        }
        
        
        if(~['path'].indexOf(mpath)){
            var nodeCore;
            nodeCore = require('node-libs-browser')[mpath];
            if(nodeCore){
                fullPath = nodeCore.replace(basedir+'/','/')    
            }else{
                throw new Error("No polyfill for core module!")
            }
        }else{
            fullPath = resolve.sync(mpath,{basedir: parentPath||basedir,extensions:['.js','.json'],paths:[basedir]}).replace(basedir+'/','/');
        }
        
        
        var absolute = path.join(basedir,fullPath);
        
        return {
            absolute: absolute,
            mpath: mpath,
            fullPath: fullPath
        };
        
    }catch(e){
        throw Error("No such file");
    }
}

module.exports = function(options){
    options = options||{};
    var basedir = options.basedir||path.dirname(require.main.filename);
    
    function main(req,res,next){
        try{
            var mpath = req.params[0];
            var mode;
            if(mpath.match(/^\$\//)){
                mode = "source";
                mpath = mpath.replace(/^\$\//,'');
            }
            
            var resolved = resolveModule(mpath,basedir);

            
            fs.readFile(resolved.absolute, function(err, data) {
                try{
                    if (err) {
                        throw new Error("File not found.");
                    }
                
                    if(mode === "source"){
                    
                    }else{
                        var contentType = mime.lookup(resolved.absolute);
                        data = data.toString();
                        if(~contentType.indexOf('json')){
                            data = wrapJson(data,resolved.mpath,resolved.fullPath);
                        }else{
                            data = data.replace(/(\/\/#(.*?)sourceMappingURL(.*))$/gm,'');
                            if(resolved.fullPath.match(/^\/public/)){
                                //Шаг 1. Убираем все что не должно попасть на клиент
                                
                                data = enviromentTransformer("client")(data);

                                // Транспилируем код
                                var transpiled = babel.transform(data,{
                                    "presets": ["es2015", "stage-0"],
                                    "plugins": [
                                        "transform-decorators-legacy"
                                    ],
                                    sourceMapTarget: req.originalUrl,
                                    sourceRoot: '',
                                    sourceFileName: resolved.fullPath,
                                    sourceMaps: 'inline',
                                    comments: false
                                });
                                data = transpiled.code;
                            }
        
                            data = wrapSource(data,resolved.mpath,resolved.fullPath);
                        }
                    }
                    
                    res.setHeader("Content-Type", 'text/javascript');
                    res.writeHead(200);
                    res.end(data);
                }catch(e){
                    console.log("error",e);
                    res.status(404).send(e.message).end();
                }
            });
        }catch(e){
            console.log("error",e);
            res.status(404).send(e.message).end();
        }
    };

    return main;
}