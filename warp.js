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
		self.reconnectInterval = options.reconnectInterval ? options.reconnectInterval : 1000
		self.ssl = options.ssl ? options.ssl : false

		var endpoint = options.endpoint+'/socket'

		var prot = options.ssl ? 'wss' : 'ws'
		self.ws = new ReconnectingWebSocket(prot+'://'+endpoint, null,
			{debug: false, reconnectInterval: self.reconnectInterval})

		self.ws.onopen = function(evt) {
			if(self.debug) {
				var obj = new Object()
				obj.type = evt.type
				obj.timestamp = evt.timeStamp
				console.info('[warp] open: '+JSON.stringify(obj))
			}

			console.log(self.buffer)

			var channels = self.channel.all()
			if(self.debug) 
				console.log('[warp] reconnect to channels: '+JSON.stringify(channels))
			if(channels.length > 0) {
				channels.forEach(function(channel) {
					var data = self.channel.data[channel]
					self._subscribe(channel, data)
				})
			}

			self.ready = true
			self._sendBuffer()
		}

		self.ws.onclose = function(evt) {
			if(self.debug) {
				var obj = new Object()
				obj.type = evt.type
				obj.timestamp = evt.timeStamp
				console.info('[warp]: '+JSON.stringify(obj))
			}
			self.ready = false
		}

		self.ws.onmessage = function(evt) {
			var response = JSON.parse(evt.data)
			if(self.debug)
				console.debug('[warp] receive message: '+JSON.stringify(response))

			if(response.channel && self.channel.get(response.channel))
				self.channel.get(response.channel)(response)
			else if(response.sub && self.channel.get(response.sub.channel))
				self.channel.get(response.sub.channel)(response)
			else if(response.unsub && self.channel.get(response.unsub.channel))
				self.channel.get(response.unsub.channel)(response)	
		}

		self.ws.onerror = function(evt) {
			if(self.debug) {
				console.error('[warp] ERROR')
				console.error(evt)
			}
		}

		self._sendJSON = function(obj) {
			if(self.debug)
				console.debug('[warp] send message: '+JSON.stringify(obj))

			self.ws.send(JSON.stringify(obj))
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

		self._subscribe = function(channel, data) {
			var obj = new Object()
			obj.subscribe = channel
			if(data)
				obj.data = data
			self._sendJSON(obj)
		}

		self._close = function() {
			self.ws.close(1000)
		}

	}

	Warp.prototype.subscribe = function(channel, callback, data) {
		this.channel.add(channel, callback, data)
		if(this.ws.readyState)
			this._subscribe(channel, data)
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

	Warp.prototype.status = function() {
		return this.ws.readyState
	}

	this.Warp = Warp
}).call(this);

;(function() {

	function Channel(options) {
		options = options || {}
		this.debug = options.debug ? options.debug : false
		this.channel = new Object()
		this.data = new Object()
	}

	Channel.prototype.add = function(channel, callback, data) {
		this.channel[channel] = callback
		this.data[channel] = data
		if(this.debug)
			console.info('[warp]: subscribed to channel '+channel)
	}

	Channel.prototype.get = function(channel) {
		return this.channel[channel]
	}

	Channel.prototype.remove = function(channel) {
		delete this.channel[channel]
		delete this.data[channel]
	}

	Channel.prototype.all = function() {
		return Object.keys(this.channel)
	}

	Warp.Channel = Channel
}).call(this);
