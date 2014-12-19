;(function() { 

	function Warp(options) {
		options = options || {}

		this.channels = new Warp.Channels(options)
		this.params = options.params
		this.ready = false
		this.buffer = []

		var self = this
		
		self.debug = options.debug ? options.debug : false

		var endpoint = (options.endpoint ? options.endpoint : 'localhost:9000')
			+'/socket'

		var ws = new ReconnectingWebSocket('ws://'+endpoint)
		
		ws.onopen = function(evt) {       	        
	        if(self.debug) {
	        	var obj = new Object()
	        	obj.type = evt.type
	        	obj.timestamp = evt.timeStamp
	        	console.log('[warp] open: '+JSON.stringify(obj))
	        }

	        self.ready = true
	        self._sendBuffer()
	    }

	    ws.onclose = function(evt) {
	    	if(self.debug) {
	        	var obj = new Object()
	        	obj.type = evt.type
	        	obj.timestamp = evt.timeStamp
	        	console.log('[warp]: '+JSON.stringify(obj))
	        }
	    }

	    ws.onmessage = function(evt) {
	    	var response = JSON.parse(evt.data)
	    	if(self.debug)
	    		console.log('[warp] receive message: '+JSON.stringify(response))

	    	if(response.channel && self.channels.get(response.channel))
	        	self.channels.get(response.channel)(response.msg)
	    }

	    ws.onerror = function(evt) {
	        if(self.debug)
	        	console.log('[warp] ERROR: '+JSON.stringify(evt))
	    }

	    self._sendJSON = function(obj) {
	    	if(self.debug)
	    		console.log('[warp] send message: '+JSON.stringify(obj))

	    	ws.send(JSON.stringify(obj))
	    }

	    self._sendBuffer = function () {
	    	self.buffer.forEach(function(bufferObj, index) {
	        		setTimeout(function() {
	        			self._sendJSON(bufferObj)
	        		}, 100)
	        	})
	    	self.buffer = []
	    }

	    self._send = function(channel, msg) {
	    	var obj = new Object()
			obj.channel = channel
			obj.timestamp = Date.now()
			if(this.params)
				obj.params = this.params
			
			obj.msg = msg

			if(self.ready) 
				self._sendJSON(obj)
			else
				self.buffer.push(obj)
	    }

	    self._subscribe = function(channel) {
	    	var obj = new Object()
	    	obj.subscribe = channel
	    	if(self.ready) 
				self._sendJSON(obj)
			else
				self.buffer.push(obj)
	    }

	    self._close = function() {
	    	ws.close(1000)
	    }
		
	}

	Warp.prototype.subscribe = function(channel, callback) {
		this.channels.add(channel, callback)
		this._subscribe(channel)
	}

	Warp.prototype.unsubscribe = function(channel) {
		this.channels.remove(channel)
	}

	Warp.prototype.beam = function(channel, msg) {
		this._send(channel, msg)
	}

	Warp.prototype.allChannels = function() {
		return this.channels.all()
	}

	Warp.prototype.close = function() {
		this._close()
	}

	this.Warp = Warp
}).call(this);

;(function() {

	function Channels(options) {
		options = options || {}
		this.debug = options.debug ? options.debug : false
		this.channels = new Object()
	}

	Channels.prototype.add = function(channel, callback) {
		this.channels[channel] = callback
		if(this.debug)
			console.log('[warp]: subscribed to channel '+channel)
	}

	Channels.prototype.get = function(channel) {
		return this.channels[channel]
	}

	Channels.prototype.remove = function(channel) {
		delete this.channels[channel]
	}

	Channels.prototype.all = function() {
		return Object.keys(this.channels)
	}

	Warp.Channels = Channels
}).call(this);
