var resolve = require("resolve");
var path = require('path');
var fs = require('fs');
var mime = require('mime');
var assign = require("lodash/object/assign");

var CodeManager = require("isomorphic-modules/code-manager");
var manager = new CodeManager({
    compile: false,
    cache: "client-cache"
});


function wrapSource(content,id,filename){
    return content+'\n//# moduleInfo={"id": "'+id+'","filename": "'+filename+'"}';
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
        
        
        if(~['path'].indexOf(mpath)&&mpath){
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
    manager.addTransformer(function (result){
        if(result.code){
            result.code = result.code.replace(/(\/\/#(.*?)sourceMappingURL(.*))$/gm,'');
        }
        return result;
    },['.js']);
    
    manager.addTransformers(options.transform);
    
    function main(req,res,next){
        try{
            var mpath = req.params[0];
            var resolved = resolveModule(mpath,basedir);
            
            manager.transform(resolved.absolute,function(result){
                if(result&&result.code!==undefined){
                    var code = result.code;
                    var map = result.map;
                    code = wrapSource(code,resolved.mpath,resolved.fullPath);
                    
                    res.setHeader("Content-Type", 'text/javascript');
                    res.append("Cache-Control", "max-age=31536000, must-revalidate");
                    res.end(code);
                }else{
                    res.status(404).send("No such file").end();
                }
            },{
                mapTarget: resolved.fullPath
            });
        
        }catch(e){
            console.log("error",e);
            res.status(404).send(e.message).end();
        }
    };

    return main;
}