var domready = require("domready");

//globals
var context = new AudioContext();
var origin = null;

//TODO: create a looping sound source from a given table
function create_audio_source(el){
	var rect = el.getBoundingClientRect();
	var xy = {x: rect.left + rect.width/2, y: rect.top + rect.height/2};
	var pos_sample = new PositionSample(xy);
}

//TODO: setup all audio loops from all surrounding repos
function refresh_audio(new_origin){
	//first run through
	if(origin == null){
		//just pick on table as a source for now
		create_audio_source(document.getElementById('big-table-1'));
	}
	origin = new_origin;
	//TODO: set listener position
}

//on click, set table as origin point for sound
function set_user_origin(e){
	var rect = this.getBoundingClientRect();
	var xy = {x: rect.left + rect.width/2, y: rect.top + rect.height/2};
	context.listener.setPosition(xy.x, xy.y, 0);
	context.listener.setOrientation(0,-1,0, 0,0,-1);
	refresh_audio(xy);
}

//where everything is good to go
domready(function(){
	var room = document.getElementsByClassName('main-room')[0];
	for (var i = 0; i < room.childNodes.length; i++) {
		var cla = room.childNodes[i].className;
		//get all tables
		if(cla != null && cla.indexOf("table")){
			room.childNodes[i].onclick = set_user_origin;
		}
	}
});

//Helper class used by HTML5Rocks
function BufferLoader(context, urlList, callback) {
  this.context = context;
  this.urlList = urlList;
  this.onload = callback;
  this.bufferList = new Array();
  this.loadCount = 0;
}

BufferLoader.prototype.loadBuffer = function(url, index) {
  // Load buffer asynchronously
  var request = new XMLHttpRequest();
  request.open("GET", url, true);
  request.responseType = "arraybuffer";

  var loader = this;

  request.onload = function() {
    // Asynchronously decode the audio file data in request.response
    loader.context.decodeAudioData(
      request.response,
      function(buffer) {
        if (!buffer) {
          alert('error decoding file data: ' + url);
          return;
        }
        loader.bufferList[index] = buffer;
        if (++loader.loadCount == loader.urlList.length)
          loader.onload(loader.bufferList);
      },
      function(error) {
        console.error('decodeAudioData error', error);
      }
    );
  }

  request.onerror = function() {
    alert('BufferLoader: XHR error');
  }

  request.send();
}

BufferLoader.prototype.load = function() {
  for (var i = 0; i < this.urlList.length; ++i)
  this.loadBuffer(this.urlList[i], i);
}

// Super version: http://chromium.googlecode.com/svn/trunk/samples/audio/simple.html
function PositionSample(position) {
	var urls = ['position.wav'];
	var sample = this;
	this.isPlaying = false;

	// Load the sample to pan around.
	var loader = new BufferLoader(context, urls, function(buffers) {
		sample.buffer = buffers[0];
		sample.setPosition(position);
	});
	loader.load();
}

PositionSample.prototype.play = function() {
	// Hook up the audio graph for this sample.
	var source = context.createBufferSource();
	source.buffer = this.buffer;
	source.loop = true;
	//create an omnidirectional audio source
	var panner = context.createPanner();
	panner.coneOuterGain = 0;
	panner.coneOuterAngle = 0;
	panner.coneInnerAngle = 360;
	panner.rolloffFactor = 0.1;
	panner.connect(context.destination);
	source.connect(panner);
	source.start(0);

	// Expose parts of the audio graph to other functions.
	this.source = source;
	this.panner = panner;
	this.isPlaying = true;
}

PositionSample.prototype.stop = function() {
	if(this.source){
		this.source.stop(0);
	}
	this.isPlaying = false;
}

PositionSample.prototype.setPosition = function(position) {
	//play if we have a position
	if (position) {
		if (!this.isPlaying) {
			this.play();
		}
		this.panner.setPosition(position.x, position.y, -0.5);
	} else {
		this.stop();
	}
};
