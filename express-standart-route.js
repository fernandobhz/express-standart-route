 var recursiveReadDir = require('recursive-readdir');
var path = require('path');

module.exports = async function(app, folder, extension) {
	var folder = folder || 'routes';
	var extension = extension || 'js';

	return new Promise(async function(resolve, reject) {
		try {
			var views = app.get('views');
			var routes = path.resolve(app.locals.views + '/../' + folder);	

			var files = await recursiveReadDir(routes);
			var files = files.filter(x=>x.endsWith(extension));
			var files = files.map(x=>x.replace(/\\/g, '/') );

			files.sort();

			//middlewares
			for (file of files) {
				var standalone = require(file);
				
				if (standalone.middleware) {
					//remove .js
					var pathname = file.substr(routes.length, file.length - routes.length - (extension.length + 1));
					
					//remove ultima parte
					var pathParts = pathname.split('/');
					pathParts.pop();
					
					//rota
					var pathname = pathParts.join('/');
					app.use(pathname, standalone.middleware);				
				}
			}

			//standart files
			for (file of files) {
				var standalone = require(file);

				// Bulding route path
				// standalone/admin/exemplo.js > admin/exemplo
				var pathname = file.substr(routes.length, file.length - routes.length - (extension.length + 1));

				var pathname = pathname.split('/').map(function(part) {
					if ( part.startsWith('{') && part.endsWith('}') )
						return ':' + part.substr(1, part.length - 2);
					else
						return part;
				}).join('/');
				
				
				// prevent the real file to be exposed to the web
				app.use(file.substr(routes.length), function(req, res, next) {
				  var err = new Error('Not Found');
				  err.status = 404;
				  next(err);
				});
				
				
				// _index especial files
				if ( pathname.endsWith('/index') ) {
					pathname = pathname.substr(0, pathname.length - '/index'.length);
				}
				
				// output the pathname routed
				console.log(pathname);

				// example/example.js files (like index files)
				var pathnameParts = pathname.split('/');
				var pathnameLast = pathnameParts.pop();
				var pathnamePenultimate = pathnameParts.pop();

				if ( pathnameLast ) pathnameLast = pathnameLast.replace(':', '');
				if ( pathnamePenultimate ) pathnamePenultimate = pathnamePenultimate.replace(':', '');
				
				if ( pathnameLast == pathnamePenultimate ) {
					pathname = pathname.substr(0, pathname.length - pathnameLast.length - 1);
				}
				
				if ( typeof standalone == 'function' ) {
					app.use(pathname, standalone);
					continue;
				}

				if ( standalone.partial ) standalone.partial(app, pathname);
				if ( standalone.use ) app.use(pathname, standalone.use);
				if ( standalone.router ) app.use(pathname, standalone.router);
				if ( standalone.get ) app.get(pathname, standalone.get);
				if ( standalone.post ) app.post(pathname, standalone.post);
				if ( standalone.put ) app.put(pathname, standalone.put);
				if ( standalone.delete ) app.delete(pathname, standalone.delete);
			}			

			resolve();
		} catch (err) {
			reject(err);
		}
	});
}