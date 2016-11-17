/**
 * Constructs a KeggAnimation object.
 * 
 * @constructor
 *
 * @param data
 *   an array of time points
 */
function KeggAnimation () {
	this.timer = null;
	this.next = null;
	this.selectedGroup = null;

	this.dom = null;
	this.moleculars = null;
	this.rawdata = null;
	this.metadata = null;
	this.keggObjects = null;
	this.f_rawdata = null;
	
	this.phylogram = null;
	this.selector = null;
  this.options = null;

	this.timeIntervalForGroup = null;
	this.sorted_timelines_for_group = null;
	this.duration = 1000;
	this.progressBarWidth = 300;
	this.colorScale = null;
	this.colorRange = null;
}


KeggAnimation.prototype.setColor = function(c) {
  this.colorScale = c;
  this.colorRange = c.range();
}

KeggAnimation.prototype.filter = function(rawdata, group) {
  var filtered = rawdata.filter(function (d){
    return group.indexOf(d.sample_id)>=0;
  });
  return filtered;
}

KeggAnimation.prototype.setPhylogram = function(phylogram) {
  this.phylogram = phylogram;
}

KeggAnimation.prototype.setData = function(dom, moleculars, rawdata, metadata) {
	this.dom = dom;
	keggObjects = [];
	this.dom.forEach (function (d,i) {
		var mol = moleculars[i];
		d.each(function (idx, x) {
			var eid = x.getAttributeNode('eid').value;
//			console.log(eid);
			if (keggObjects[eid] == undefined) {
				keggObjects[eid] = [mol.id];
			} else {
				if(keggObjects[eid].indexOf(mol.id) < 0) keggObjects[eid].push(mol.id);
			}
		});
	});
	this.keggObjects = keggObjects;
	this.moleculars = moleculars;
	this.rawdata = rawdata;
	this.metadata = metadata;

//	// set up a color scale
//	var sorted = rawdata.map(function (d){return d.value;}).sort(function(a, b) {
//		return a - b;
//	});
//	var min = d3.min(sorted);
//	var max = d3.max(sorted);
//	console.log('min:' + min + ", max:" + max);
//	var domain = [];
//	if (min * max >= 0) {
//		domain = [min, (min+max)/2, max];
//	} else {
//		domain = [min, 0, max];
//	}
	
//	this.colorScale = d3.scale.linear()
//		.domain(domain) 
//		.range(colorbrewer.RdYlBu[5].reverse()
////		        ["#2166AC", "#f7f7f7", "#B2182B"]
//		        );
//	
	var _this = this;

	// get time interval for each group
	this.timeIntervalForGroup = {};
	Object.keys(metadata.info).forEach(function (d){
		var group = metadata.info[d].group;
		var timeline = metadata.info[d].timeline;
		var timeline_for_group = {};
		if (_this.timeIntervalForGroup.hasOwnProperty(group)) {
			timeline_for_group = _this.timeIntervalForGroup[group];
		}
		var samples_for_time = [];
		if (timeline_for_group.hasOwnProperty(timeline)) {
			samples_for_time = timeline_for_group[timeline];
		} 
		samples_for_time.push(d);
		timeline_for_group[timeline] = samples_for_time;
		_this.timeIntervalForGroup[group] = timeline_for_group;
	});
	
	this.sorted_timelines_for_group = {};
	Object.keys(this.timeIntervalForGroup).forEach(function (group){
		var timelines = _this.timeIntervalForGroup[group];
		_this.sorted_timelines_for_group[group] = Object.keys(timelines).sort(function (a, b) {
			return (+a)-(+b);
		});
	});

	// initialize
	this.next = 0;
	this.selectedGroup = Object.keys(this.timeIntervalForGroup)[0];
	
	// filter according to the group
	var colarr = [];
	Object.keys(this.timeIntervalForGroup[this.selectedGroup]).forEach(function(d) {
		colarr=colarr.concat(_this.timeIntervalForGroup[_this.selectedGroup][d]);
	});
	this.f_rawdata = this.filter(this.rawdata, colarr);
	this.setPlayer();
	this.pause();
	//this.start();
}

/**
 * Set up the player
 */ 
KeggAnimation.prototype.setPlayer = function() {
	var _this = this;
//	$("#pathway-controller .content").append('<div id ="player" class="ui icon buttons" role="group" aria-label="..."></div>');
	$('#player').parent().show();
	$('#player').hover(function() {
		$('#player .btn').velocity({'opacity' : '0.8'});
	}, function() {
		$('#player .btn').velocity({'opacity' : '0.2'});
	});
	
	// set player buttons
	this.setButton('fast_backward', 'FastBackward', 'fast backward icon', function (evt) {
		_this.pause();
		_this.next = 0;
		_this.step();
	});
	this.setButton('backward', 'Backward', 'backward icon', function (evt) {
		_this.pause();
		_this.next-=2;
		_this.next = _this.next < 0 ? 0 : _this.next;
		_this.step();
	});
	this.setButton('play', 'Play/Pause', 'pause icon', function (evt) {
		if ($('#player .play i').attr('class') == 'pause icon') {
			_this.pause();
		} else if ($('#player .play i').attr('class') == 'play icon') {
			_this.start();
		}
	});
	this.setButton('forward', 'Forward', 'forward icon', function (evt) {
		_this.pause();
		_this.next = _this.next < _this.sorted_timelines_for_group[_this.selectedGroup].length ? _this.next : _this.sorted_timelines_for_group[_this.selectedGroup].length -1;
		_this.step();
	});
	this.setButton('fast_forward', 'Fast Forward', 'fast forward icon', function (evt) {
		_this.pause();
		_this.next = _this.sorted_timelines_for_group[_this.selectedGroup].length - 1;
		_this.step();
	});
	var total = _this.sorted_timelines_for_group[_this.selectedGroup][_this.sorted_timelines_for_group[_this.selectedGroup].length-1];
	// progress bar
	var progress = '<div class="ui progress" id="timeline" data-total="'
	  + total
	  +'"><div class="bar" style="min-width:0.5em !important;"><div class="progress"></div></div></div>';
	$('#progress_container').append(progress);
	$('#progress_container').show();
	this.setProgressBar(0, 0);
//	$('#player .progress').append('<div class="bar"><div class="progress"></div></div><div class="label"></div></div>');
	$('[data-toggle="tooltip-player"]').popup();
//	$('#player .progress').on('click', function(evt){
//	  var timeIndex = Math.floor(evt.offsetX * (_this.sorted_timelines_for_group[_this.selectedGroup].length-1) / _this.progressBarWidth);
//	  _this.pause();
//    _this.next = timeIndex;
//    _this.step();
//	});
}

KeggAnimation.prototype.setGroup = function(group) {
	this.selectedGroup = group;
	// filter according to the group
	var colarr = [];
	var _this = this;
	Object.keys(this.timeIntervalForGroup[this.selectedGroup]).forEach(function(d) {
		colarr=colarr.concat(_this.timeIntervalForGroup[_this.selectedGroup][d]);
	});
	this.f_rawdata = this.filter(this.rawdata, colarr);
	this.next = this.next > 0 ? this.next-1 : 0;
	this.step();
}

/**
 * Set up the buttons
 */ 
KeggAnimation.prototype.setButton = function(name, label, icon, callback) {
	$('#player').append('<button class ="ui button '+name+'"></button>');
	$('#player button.'+name).attr('data-toggle', "tooltip-player").attr('data-placement', "bottom").attr('title', label);
	$('#player button.'+name).append('<i></i>');
	$('#player button.'+name+' i').attr('class', icon);
	$('#player button.'+name).click(callback);
}

KeggAnimation.prototype.setProgressBar = function(percent, time) {
//  $('#player #timeline').attr('aria-valuenow', percent).css('width', percent+'%').html('T'+time);
  $('#progress_container #timeline').progress({
    label: 'ratio',
    text: {
      ratio: 'T{value}'
    },
    autoSuccess:false,
    showActivity:false,
    value: time
  });
//  $('#progress_container #timeline .label').html('T'+time);
}

/**
 * Start KEGG animation by setting up a timer
 */ 
KeggAnimation.prototype.start = function() {
	var _this = this;
	$('#player .play i').attr('class', 'pause icon');
	var step = this.step;
	 if (this.timer == null) this.timer = setInterval(function () {
	   _this.step(_this);
	 }, this.duration);
}

KeggAnimation.prototype.step = function(obj) {
  var obj = obj || this;
	console.log('update');
	var num_timepoints = obj.sorted_timelines_for_group[obj.selectedGroup].length;
	var timeIndex = obj.next % num_timepoints;
	var timeinfo = obj.sorted_timelines_for_group[obj.selectedGroup][timeIndex];
	var samples = obj.timeIntervalForGroup[obj.selectedGroup][timeinfo];
	
	var percent = 100 * timeIndex / (num_timepoints-1);
	obj.setProgressBar(percent, timeinfo);
	console.log(timeinfo);
	function rgbToHex(str){
		function toHex(n) {
		   	 n = parseInt(n,10);
		   	 if (isNaN(n)) return "00";
		   	 n = Math.max(0,Math.min(n,255));
		   	 return "0123456789ABCDEF".charAt((n-n%16)/16)
		   	      + "0123456789ABCDEF".charAt(n%16);
		}
	   	var regex = /rgb\((\d{3}).+(\d{3}).+(\d{3})\)/g;
	   	var mat = regex.exec(str);
	   	if(!mat) return;
	   	var r = mat[1];
	   	var g = mat[2];
	   	var b = mat[3];
	   	return '#'+toHex(r)+toHex(g)+toHex(b);
   }
	obj.keggObjects.forEach(function (d, eid) {
		var entries = $('#pathway .entry[eid="'+eid+'"]');
		var data = obj.f_rawdata.filter(function (e) { return (d.indexOf(e.molecule_id)>=0 && samples.indexOf(e.sample_id)>=0);})
		if (data) {
			var val = d3.mean(data.map(function (k) {return k.value;}));
			var color = adbio.color.na;
			if (val != undefined) color = rgbToHex(obj.colorScale(val));
			entries.each(function (index, value) {
				if (value.nodeName == 'rect') $(value).velocity({'fill':color}, obj.colorRange);
				else if (value.nodeName == 'path') $(value).velocity({'stroke':color}, obj.colorRange);
			});
		}
	});
	
	if(obj.phylogram) {
	  d3.phylogram.updateTime(obj.colorScale, obj.next);
	}
	
	// update time
	obj.next++;
	obj.next = (obj.next == num_timepoints) ? 0 : obj.next;
	
}

/**
 * Stop KEGG animation
 */ 
KeggAnimation.prototype.pause = function() {
	$('#player .play i').attr('class', 'play icon');
	if (this.timer != null) {
		clearInterval(this.timer);
		this.timer = null;
	}
}

/**
 * Update colors
 */
KeggAnimation.prototype.update = function() {
	console.log('update');
	this.dom.forEach(function (d) {$(d[0]).attr('stroke','yellow') } )
}