var domready = require("domready");

//globals
var context = new AudioContext();
var token = gitToken.token;

var cumulativeOffset = function(element) {
    var top = 0, left = 0;
    do {
        top += element.offsetTop  || 0;
        left += element.offsetLeft || 0;
        element = element.offsetParent;
    } while(element);

    return {
		x: left,
        y: top
    };
};

//G, A, Bb, C, D, Eb, F
var g_minor_432 = [384.87, 432.00, 457.69, 513.74, 576.65, 610.94, 685.76, 769.74, 864.00, 915.38, 1027.47, 1153.30, 1221.88, 1371.51, 1539.47, 1728.00];
var color_classes = ['orange', 'green', 'red', 'blue'];
var used_tables = [];

//TODO: create a sound based on commit info and play
function play_commit(commit){
	//clear colors from element
	var new_list = [];
	for (var i = 0; i < color_classes.length; i++) {
		commit.elem.classList.remove(color_classes[i]);
	}
	//get position
	var xy = cumulativeOffset(commit.elem);
	var rect = commit.elem.getBoundingClientRect();
	xy.x += rect.width/2;
	xy.y += rect.height/2;
	//get frequency (based on sha1)
	var n = parseInt(commit.sha[0], 16);
	var duration = 4.5;
	var pos_sample = new PositionSample(xy, g_minor_432[n]);
	//color it
	commit.elem.classList.add(color_classes[n % 4]);
	used_tables[commit.table_i]++;
	setTimeout(function(ind, cla){
		used_tables[ind]--;
		if(used_tables[ind] <= 0){
			commit.elem.classList.remove(cla);
		}
	}, duration * 1000, commit.table_i, color_classes[n % 4]);
}

//load all commits of the day and attach to table element
function load_commits(tables, callback){
	var all_commits = [];
	var start_date = new Date(2016, 10, 12, 12, 0, 0, 0);	//start of hackathon
	//to return just once
	var callback_count = 0;
	var callback_ind = 0;
	var internal_callback = function(){
		callback_ind++;
		if(callback_count == callback_ind){
			//sort by date, return
			all_commits.sort(function(a, b){
				if(a['date'] > b['date'])
					return 1;
				if(a['date'] < b['date'])
					return -1;
				return 0;
			});
			callback(all_commits);
		}
	}
	//set all tables to not used
	for (var i = 0; i < tables.length; i++) {
		used_tables.push(0);
	}
	//for all project tables at hackathon
	for (var i = 0; i < tables.length; i++) {
		if(tables[i].attributes['data-url']){
			setTimeout(function(url, table_i){
				var hashes = [];
				//remove github link and just leave /:author/:repo:
				url = url.substring(url.indexOf("github.com/")+11);
				//get all branches of repo
				var branch_url = "https://api.github.com/repos/"+url+"/branches?access_token="+token;
				$.get(branch_url, function(branches){
					callback_count += branches.length;
					for (var j = 0; j < branches.length; j++) {
						setTimeout(function(sha){
							//get all commits with this sha
							var commits_url = "https://api.github.com/repos/"+url+"/commits?access_token="+token+"&sha="+sha;
							$.get(commits_url, function(commits){
								for (var k = 0; k < commits.length; k++) {
									var commit_date = new Date(commits[k]['commit']['author']['date']);
									if(commit_date > start_date){
										if(hashes.indexOf(commits[k].sha) >= 0){
											continue;
										}
										commits[k]['date'] = commit_date;
										commits[k]['timestamp'] = commit_date - start_date;
										commits[k]['elem'] = tables[table_i];
										commits[k]['table_i'] = table_i;
										hashes.push(commits[k].sha);
										all_commits.push(commits[k]);
									}
								}
								internal_callback();
							});
						}, 0, branches[j].commit.sha);
					}
				});
			}, 0, tables[i].attributes['data-url'].value, i);
		}
	}
}

//TODO: play through all commits of the day
function play_commits(tables, new_origin, new_dir){
	//set our position
	context.listener.setPosition(new_origin.x, new_origin.y, 0);
	context.listener.setOrientation(new_dir.x,new_dir.y,0, 0,0,-1);
	load_commits(tables, function(commits){
		for (var i = 0; i < commits.length; i++) {
			setTimeout(function(ind){
				play_commit(commits[ind]);
			}, commits[i].timestamp / 1000, i);
		}
	});
}

//where everything is good to go
domready(function(){
	var room = document.getElementsByClassName('main-room')[0];
	var tables = [];
	for (var i = 0; i < room.childNodes.length; i++) {
		var cla = room.childNodes[i].className;
		//get all tables
		if(cla != null && cla.indexOf("table") >= 0){
			tables.push(room.childNodes[i]);
		}
	}
	//get user's position
	var room_rect = room.getBoundingClientRect();
	var popup = document.getElementById('popup');
	room.onclick = function(e){
		if(e.target.className != 'main-room'){
			return;
		}
		//add a marker
		var el = document.createElement('div');
		el.className = 'spot';
		el.style.left= (e.layerX)+'px';
		el.style.top = (e.layerY)+'px';
		room.appendChild(el);
		var user_pos = {x: e.pageX, y: e.pageY};
		//change message
		popup.innerHTML = 'Please click where you were facing';
		//TODO: get user's orientation
		this.onclick = function(e){
			var second_point = {x: e.pageX, y: e.pageY};
			if(second_point == user_pos){
				return;
			}
			//rotate the element
			var rads = Math.atan2(second_point.x - user_pos.x, user_pos.y - second_point.y);
			el.style.transform = 'rotate('+rads+'rad)';
			var dir = {x: second_point.x - user_pos.x, y: second_point.y - user_pos.y, z: 0};
			//normalize & start audio
			var mag = 1/Math.sqrt(dir.x*dir.x + dir.y*dir.y +dir.z*dir.z);
			dir.x *= mag;
			dir.y *= mag;
			dir.z *= mag;
			this.onclick = null;
			play_commits(tables, user_pos, dir);
			//set message
			popup.innerHTML = 'Enjoy :D';
			popup.className = 'popup hide';
		}
	}
});

// Super version: http://chromium.googlecode.com/svn/trunk/samples/audio/simple.html
function PositionSample(position, freq) {
	this.isPlaying = false;

	//create random data in audio buffer
	var fadeCount = context.sampleRate * 0.5;	//fade time
	var frameCount = context.sampleRate * 4.0; //4s of audio
	var audio_buffer = context.createBuffer(1, 2*fadeCount + frameCount, context.sampleRate);
	var audio_frames = audio_buffer.getChannelData(0);
	var sin_scale = freq * 2 * Math.PI / context.sampleRate;
	//first do a fade in
	for (var i = 0; i < fadeCount; i++) {
		//audio data needs to be between -1.0 and 1.0
		audio_frames[i] = (i/fadeCount) * 0.8 * Math.sin(i * sin_scale);
	}
	//then play the sample
	for (var i = 0; i < frameCount; i++) {
		//audio data needs to be between -1.0 and 1.0
		audio_frames[fadeCount + i] = 0.8 * Math.sin(i * sin_scale);
	}
	//then a fade out
	for (var i = 0; i < fadeCount; i++) {
		//audio data needs to be between -1.0 and 1.0
		audio_frames[fadeCount + frameCount + i] = ((fadeCount-i)/fadeCount) * 0.8 * Math.sin(i * sin_scale);
	}
	this.buffer = audio_buffer;
	this.setPosition(position);
}

PositionSample.prototype.play = function() {
	// Hook up the audio graph for this sample.
	var source = context.createBufferSource();
	source.buffer = this.buffer;
	source.loop = false;
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
