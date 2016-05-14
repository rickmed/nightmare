If there's a need to update to a newer nightmare version:
- Transpile nightmare.js to es5.
- Replace this function in actions.js to be compatible with meteor's nodejs version:
```
function waitelem(self, selector, done) {
  var vm = require('vm')
  vm.runInThisContext("var elementPresent = function() {" + "  var element = document.querySelector('" + jsesc(selector) + "');" + "  return (element ? true : false);" + "};");
  waitfn(self, elementPresent, done);
}
```
- In runner.js replace part of code with the below. This fixes a listeners memory leak (if it is not fixed in nightmare already):
```
  /**
   * javascript
   */

  parent.respondTo('javascript', function (src, done) {

    function response (event, response) {
      renderer.removeListener('error', error);
      renderer.removeListener('log', log);
      done(null, response);
    }

    function error (event, error) {
      renderer.removeListener('response', response);
      renderer.removeListener('log', log);
      done(error);
    }

    function log (event, args) {
      parent.emit.apply(parent, ['log'].concat(args));
    }

    renderer.once('response', response)

    renderer.once('error', error);

    renderer.once('log', log);

    win.webContents.executeJavaScript(src);

  });
```
-
- There shouldn't be a change in the preload.js file. If it isn't the case add this to support iframes:
```
// Track the current document or iframe document
__nightmare.rootDocument = document;
__nightmare.currentDocument = document;
```
