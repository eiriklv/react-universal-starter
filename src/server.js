import {Server} from 'hapi';  // hapi enables developers to focus on writing reusable application logic instead of spending time building infrastructure.
import React from 'react';  // A JavaScript library for building user interfaces
import Router from 'react-router';  //  A complete routing solution for React.js.
import Transmit from 'react-transmit' // Relay-inspired library based on Promises instead of GraphQL.
import routes from 'views/Routes';
import url from 'url';

var hostname = process.env.HOSTNAME || 'localhost';

/**
 * Start Hapi server on port 8000.
 */
const server = new Server();
server.connection({
  host: hostname,
  port: process.env.PORT || 8000
});
server.start(function () {
  console.info('==> ✅  Server is listening');
  console.info('==> 🌎Go to ' + server.info.uri.toLowerCase());
});

/**
 * Try serving static requests from public folder.
 */
server.route({
  method: '*',
  path: '/{params*}', // * wildcard allows any number of segments in the url eg. /user/profile/id
  handler: (request, reply) => {
    reply.file('static' + request.path);
  }
});

/**
 * Endpoint that proxies all GitHub API requests to https://api.github.com.
 */
server.route({
  method: '*',
  path: '/api/github/{path*}',
  handler: {
    proxy: {
      passThrough: true,
      mapUri (request, callback) {
        callback(null, url.format({
          protocol: 'https',
          host: 'api.github.com',
          pathname: request.params.path,
          query: request.query
        }));
      }
    }
  }
});

/**
 * Catch dynamic requests here to fire-up React Router.
 */
server.ext('onPreResponse', (request, reply) => {
  if (typeof request.response.statusCode !== 'undefined') {
    return reply.continue();
  }

  Router.run(routes, request.path, (Handler, router) => {
    Transmit.renderToString(Handler).then(({reactString, reactData}) => {
      let output = (
        `<!doctype html>
				<html lang='en-us'>
					<head>
						<meta charset='utf-8'>
						<title>react-isomorphic-starterkit</title>
						<link rel='shortcut icon' href='/favicon.ico'>
					</head>
					<body>
						<div id='react-root'>${reactString}</div>
					</body>
				</html>`
      );

      const webserver = process.env.NODE_ENV === 'production' ? '' : '//localhost:8080';
      output = Transmit.injectIntoMarkup(output, reactData, [`${webserver}/dist/client.js`]);

      reply(output);
    }).catch((error) => {
      reply(error.stack).type('text/plain').code(500);
    });
  })
});