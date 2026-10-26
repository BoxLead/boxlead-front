var APP_PREFIX = '/app';
var APP_SHELL = '/app.html';

function redirect(location, request) {
  var query = '';
  var keys = Object.keys(request.querystring);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var entry = request.querystring[key];
    var values = entry.multiValue ? entry.multiValue : [entry];
    for (var j = 0; j < values.length; j++) {
      query += (query === '' ? '?' : '&') + encodeURIComponent(key) + '=' + encodeURIComponent(values[j].value);
    }
  }
  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: { location: { value: location + query } },
  };
}

function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri.length > 1 && uri.endsWith('/')) return redirect(uri.replace(/\/+$/, ''), request);
  if (uri === '/index.html') return redirect('/', request);
  if (uri === APP_SHELL || uri === '/404.html') {
    request.uri = '/404.html';
    return request;
  }
  if (uri.endsWith('.html')) return redirect(uri.slice(0, -5), request);
  if (uri === APP_PREFIX || uri.startsWith(APP_PREFIX + '/')) {
    request.uri = APP_SHELL;
    return request;
  }
  if (uri === '/') return request;
  var last = uri.slice(uri.lastIndexOf('/') + 1);
  if (!last.includes('.')) request.uri = uri + '.html';
  return request;
}
