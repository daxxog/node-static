var vows    = require('vows')
  , request = require('request')
  , assert  = require('assert')
  , static  = require('../../lib/node-static');

var fileServer = new(static.Server)(__dirname + '/../fixtures', {serverInfo: 'custom-server-name'});

var suite = vows.describe('node-static');

var TEST_PORT = 8080;
var TEST_SERVER = 'http://localhost:' + TEST_PORT;
var server;
var callback;

suite.addBatch({
  'once an http server is listening with a callback': {
    topic: function () {
      server = require('http').createServer(function (request, response) {
        request.addListener('end', function () {
          fileServer.serve(request, response, function(err, result) {
            if (callback)
              callback(request, response, err, result);
            else
              request.end();
          });
        });
      }).listen(TEST_PORT, this.callback)
    },
    'should be listening' : function(){
      /* This test is necessary to ensure the topic execution.
       * A topic without tests will be not executed */
      assert.isTrue(true);
    }
  },
}).addBatch({
    'streaming a 404 page': {
      topic: function(){
        callback = function(request, response, err, result) {
          if (err) {
            response.writeHead(err.status, err.headers);
            setTimeout(function() {
              response.end('Custom 404 Stream.')
            }, 100);
          }
        }
        request.get(TEST_SERVER + '/not-found', this.callback);
      },
      'should respond with 404' : function(error, response, body){
        assert.equal(response.statusCode, 404);
      },
      'should respond with the streamed content': function(error, response, body){
        callback = null;
        assert.equal(body, 'Custom 404 Stream.');
      }
    }
}).addBatch({
  'once an http server is listening without a callback': {
    topic: function () {
      server.close();
      server = require('http').createServer(function (request, response) {
        request.addListener('end', function () {
          fileServer.serve(request, response);
        });
      }).listen(TEST_PORT, this.callback)
    },
    'should be listening' : function(){
      /* This test is necessary to ensure the topic execution.
       * A topic without tests will be not executed */
      assert.isTrue(true);
    }
  }
}).addBatch({
    'requesting a file not found': {
      topic : function(){
        request.get(TEST_SERVER + '/not-found', this.callback);
      }, 
      'should respond with 404' : function(error, response, body){
        assert.equal(response.statusCode, 404);
      }
    }
}).addBatch({
  'serving hello.txt': {
    topic : function(){
      request.get(TEST_SERVER + '/hello.txt', this.callback);
    }, 
    'should respond with 200' : function(error, response, body){
      assert.equal(response.statusCode, 200);
    }, 
    'should respond with text/plain': function(error, response, body){
      assert.equal(response.headers['content-type'], 'text/plain');
    }, 
    'should respond with hello world': function(error, response, body){
      assert.equal(body, 'hello world');
    }
  }
}).addBatch({
  'serving directory index': {
    topic : function(){
      request.get(TEST_SERVER, this.callback);
    }, 
    'should respond with 200' : function(error, response, body){
      assert.equal(response.statusCode, 200);
    }, 
    'should respond with text/html': function(error, response, body){
      assert.equal(response.headers['content-type'], 'text/html');
    }
  }
}).addBatch({
  'serving index.html from the cache': {
    topic : function(){
      request.get(TEST_SERVER + '/index.html', this.callback);
    }, 
    'should respond with 200' : function(error, response, body){
      assert.equal(response.statusCode, 200);
    }, 
    'should respond with text/html': function(error, response, body){
      assert.equal(response.headers['content-type'], 'text/html');
    }
  }
}).addBatch({
  'requesting with If-None-Match': {
    topic : function(){
      var _this = this;
      request.get(TEST_SERVER + '/index.html', function(error, response, body){
        request({
          method: 'GET',
          uri: TEST_SERVER + '/index.html',
          headers: {'if-none-match': response.headers['etag']}
        },
        _this.callback);
      });
    }, 
    'should respond with 304' : function(error, response, body){
      assert.equal(response.statusCode, 304);
    }
  },
  'requesting with If-None-Match and If-Modified-Since': {
    topic : function(){
      var _this = this;
      request.get(TEST_SERVER + '/index.html', function(error, response, body){
        var modified = Date.parse(response.headers['last-modified']);
        var oneDayLater = new Date(modified + (24 * 60 * 60 * 1000)).toUTCString();
        var nonMatchingEtag = '1111222233334444';
        request({
          method: 'GET',
          uri: TEST_SERVER + '/index.html',
          headers: {
            'if-none-match': nonMatchingEtag,
            'if-modified-since': oneDayLater
          }
        },
        _this.callback);
      });
    },
    'should respond with a 200': function(error, response, body){
      assert.equal(response.statusCode, 200);
    }
  }
}).addBatch({
  'requesting HEAD': {
    topic : function(){
      request.head(TEST_SERVER + '/index.html', this.callback);
    },
    'should respond with 200' : function(error, response, body){
      assert.equal(response.statusCode, 200);
    }, 
    'head must has no body' : function(error, response, body){
      assert.isUndefined(body);
    }
  }
}).addBatch({
  'requesting headers': {
    topic : function(){
      request.head(TEST_SERVER + '/index.html', this.callback);
    },
    'should respond with node-static/0.6.0' : function(error, response, body){
      assert.equal(response.headers['server'], 'custom-server-name');
    } 
  }
}).export(module);
