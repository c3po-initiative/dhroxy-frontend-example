const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  console.log('=== setupProxy.js loaded (v3 API) ===');

  app.use(
    createProxyMiddleware({
      target: 'http://localhost:8080',
      changeOrigin: true,
      pathFilter: '/fhir',

      // http-proxy-middleware v3 uses 'on' object for event handlers
      on: {
        proxyReq: (proxyReq, req, res) => {
          console.log('=== PROXY REQUEST ===');
          console.log('Proxy path:', proxyReq.path);
          console.log('Method:', req.method);

          // Map X-Sundhed-* headers to the raw names dhroxy expects
          // (browsers block sending 'cookie' directly via fetch, so the
          //  frontend uses X-Sundhed-* prefixed headers instead)
          const cookieHeader = req.headers['x-sundhed-cookie'];
          const xsrfHeader = req.headers['x-sundhed-xsrf-token'];
          const uuidHeader = req.headers['x-sundhed-conversation-uuid'];

          console.log('Incoming X-Sundhed-Cookie:', cookieHeader ? 'present (' + cookieHeader.length + ' chars)' : 'missing');
          console.log('Incoming X-Sundhed-XSRF-Token:', xsrfHeader ? 'present' : 'missing');
          console.log('Incoming X-Sundhed-Conversation-UUID:', uuidHeader ? 'present' : 'missing');

          if (cookieHeader) {
            proxyReq.setHeader('cookie', cookieHeader);
            console.log('Mapped X-Sundhed-Cookie -> cookie');
          }
          if (xsrfHeader) {
            proxyReq.setHeader('x-xsrf-token', xsrfHeader);
            console.log('Mapped X-Sundhed-XSRF-Token -> x-xsrf-token');
          }
          if (uuidHeader) {
            proxyReq.setHeader('conversation-uuid', uuidHeader);
            console.log('Mapped X-Sundhed-Conversation-UUID -> conversation-uuid');
          }

          // Fix body forwarding: if Express body-parser consumed the body,
          // re-write it so the proxy sends the correct data
          if (req.body && req.method === 'POST') {
            const bodyData = JSON.stringify(req.body);
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
          }

          console.log('=== END PROXY REQUEST ===');
        },
        error: (err, req, res) => {
          console.error('Proxy error:', err);
        }
      }
    })
  );
};
