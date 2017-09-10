var recursiveReadDir = require('recursive-readdir');
var path = require('path');

module.exports = async function(app, callback) {
	return new Promise(async function(resolve, reject) {
		try {			
			var views = app.get('views');
			var routes = path.resolve(app.locals.views + '/../routes');		

			var files = await recursiveReadDir(routes);
			var files = files.filter(x=>x.endsWith('.js'));
			var files = files.map(x=>x.replace(/\\/g, '/') );

			files.sort();

			//special files
			for (file of files) {
				var standalone = require(file);
				var pathname = file.substr(routes.length, file.length - routes.length - 3);

				// middleware special file
				if ( pathname.endsWith('/_middleware') ) {
					var pathname = pathname.substr(0, pathname.length - '/_middleware'.length);
					app.use(pathname, standalone);
					continue;
				}

				// partial "class" special file
				if ( pathname.endsWith('/_partial') ) {
					var pathname = pathname.substr(0, pathname.length - '/_partial'.length);
					standalone(app, pathname);
					continue;
				}

				// router special file
				if ( pathname.endsWith('/_router') ) {
					var pathname = pathname.substr(0, pathname.length - '/_router'.length);
					app.use(pathname, standalone);
					continue;
				}
			}

			//standart files
			for (file of files) {
				var standalone = require(file);

				// Bulding route path
				// standalone/admin/exemplo.js > admin/exemplo
				var pathname = file.substr(routes.length, file.length - routes.length - 3);
				var pathname = pathname.split('/').map(function(part) {
					if ( part.startsWith('{') && part.endsWith('}') )
						return ':' + part.substr(1, part.length - 2);
					else
						return part;
				}).join('/');

				// _index especial files
				if ( pathname.endsWith('/_index') ) {
					pathname = pathname.substr(0, pathname.length - '/_index'.length);
				}

				// example/example.js files (like index files)
				var pathnameParts = pathname.split('/');
				var pathnameLast = pathnameParts.pop();
				var pathnamePenultimate = pathnameParts.pop();

				if ( pathnameLast == pathnamePenultimate ) {
					pathname = pathname.substr(0, pathname.length - pathnameLast.length - 1);
				}
				
				//console.log(pathname);

				if ( typeof standalone == 'function' ) {
					app.use(pathname, standalone);
					continue;
				}

				if ( standalone.partial ) standalone.partial(app, pathname);
				if ( standalone.use ) app.use(pathname, standalone.use);
				if ( standalone.get ) app.get(pathname, standalone.get);
				if ( standalone.post ) app.post(pathname, standalone.post);
				if ( standalone.put ) app.put(pathname, standalone.put);
				if ( standalone.delete ) app.delete(pathname, standalone.delete);
			}

			//public folders
			var dir = require('node-dir');

			dir.subdirs(views, function(err, subdirs) {
				if (err) throw err;

				for (subdir of subdirs) {
					subdir = subdir.replace(/\\/g, '/');

					if (subdir.endsWith('/_public')) {
						//console.log(subdir);

						var pathname = '/' + subdir.slice('views/'.length, subdir.length - '/_public'.length);
						var publicDirectory = path.join(views, subdir);

						/*console.log(pathname);
						console.log(publicDirectory);
						console.log();*/

						//static files
						app.use(pathname, express.static(publicDirectory));
					}
				}
			});

			if (callback)
				callback();
		} catch (err) {
			reject(err);
		}
	});
}