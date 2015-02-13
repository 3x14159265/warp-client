;(function() { 

	function Warp(options) {
		options = options || {}
		
		if(!options.endpoint)
		  throw "[warp] [ERROR] no endpoint defined!"

		this.channel = new Warp.Channel(options)
		this.params = options.params
		this.ready = false
		this.buffer = []

		var self = this
		
		self.debug = options.debug ? options.debug : false
		self.reconnectInterval = options.reconnectInterval ? options.reconnectInterval : 3000

		var endpoint = options.endpoint+'/socket'

		var ws = new ReconnectingWebSocket('ws://'+endpoint, null, 
			{debug: self.debug, reconnectInterval: self.reconnectInterval})
		
		ws.onopen = function(evt) {       	        
	        if(self.debug) {
	        	var obj = new Object()
	        	obj.type = evt.type
	        	obj.timestamp = evt.timeStamp
	        	console.info('[warp] open: '+JSON.stringify(obj))
	        }

	        console.log("open")
	        console.log(self.channel)
	        var channels = self.channel.channel
	        if(channels && Object.keys(channels).length > 0) {
	        	Object.keys(channels).forEach(function(channel) {
	        		console.log("subscribe "+channel)
	        		self._subscribe(channel)
	        	})
	        }

	        self.ready = true
	        self._sendBuffer()
	    }

	    ws.onclose = function(evt) {
	    	if(self.debug) {
	        	var obj = new Object()
	        	obj.type = evt.type
	        	obj.timestamp = evt.timeStamp
	        	console.info('[warp]: '+JSON.stringify(obj))
	        }
	        self.ready = false
	    }

	    ws.onmessage = function(evt) {
	    	var response = JSON.parse(evt.data)
	    	if(self.debug)
	    		console.debug('[warp] receive message: '+JSON.stringify(response))

	    	if(response.channel && self.channel.get(response.channel))
	        	self.channel.get(response.channel)(response.msg)
	    }

	    ws.onerror = function(evt) {
	        if(self.debug) {
	        	console.error('[warp] ERROR')
	        	console.error(evt)
	        }
	    }

	    self._sendJSON = function(obj) {
	    	if(self.debug)
	    		console.debug('[warp] send message: '+JSON.stringify(obj))

	    	try {
	    		ws.send(JSON.stringify(obj))
	    	} catch(e) {
	    		console.log("catch")
	    		console.log(e)
	    	}
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
		this.channel.add(channel, callback)
		this._subscribe(channel)
	}

	Warp.prototype.unsubscribe = function(channel) {
		this.channel.remove(channel)
	}

	Warp.prototype.beam = function(channel, msg) {
		this._send(channel, msg)
	}

	Warp.prototype.allChannels = function() {
		return this.channel.all()
	}

	Warp.prototype.close = function() {
		this._close()
	}

	this.Warp = Warp
}).call(this);

;(function() {

	function Channel(options) {
		options = options || {}
		this.debug = options.debug ? options.debug : false
		this.channel = new Object()
	}

	Channel.prototype.add = function(channel, callback) {
		this.channel[channel] = callback
		if(this.debug)
			console.info('[warp]: subscribed to channel '+channel)
	}

	Channel.prototype.get = function(channel) {
		return this.channel[channel]
	}

	Channel.prototype.remove = function(channel) {
		delete this.channel[channel]
	}

	Channel.prototype.all = function() {
		return Object.keys(this.channel)
	}

	Warp.Channel = Channel
}).call(this);
