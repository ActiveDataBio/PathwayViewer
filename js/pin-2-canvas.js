// to add pinning functions

var Pin2Canvas = function Pin2Canvas() {
  this.host = '/bioactive/services/pinx';
  this.timerPinMessage = null;
  //this.mongodbid = null;
  this.user_pref_sha = null;
}

// add modal and message for pinning
Pin2Canvas.prototype.setSha = function(sha) {
  this.user_pref_sha = sha;
}

Pin2Canvas.prototype.appendPinButton = function(target_selector, text) {
  var _text = text == '' ? '' : '  ' + text;
  var pinButton = ' <button id="pin_button" type="button" class="ui mini button left floated"><img alt="Pin" src="images/pin-16.png"/>'+_text+'</button> ';
  target_selector.append(pinButton);
};

Pin2Canvas.prototype.appendKeggButton = function(target_selector, text) {
  var _text = text == '' ? '' : '  ' + text;
  var keggButton = ' <button id="kegg_button" type="button" class="ui mini button" style="padding-left: 5px; padding-right: 5px; margin-right: 5px"><img alt="Kegg" src="images/kegg1.png"/>'
          + _text + '</button> ';
  target_selector.append(keggButton);
};

Pin2Canvas.prototype.appendHMapButton = function(target_selector, text) {
  var _text = text == '' ? '' : '  ' + text;
  var hmapButton = ' <button id="hmap_button" type="button" class="ui mini button" style="padding-left: 5px; padding-right: 5px; margin-right: 5px"><img alt="Hmap" src="images/heatmap_btn.png"/>'
          + _text + '</button> ';
  target_selector.append(hmapButton);
};

Pin2Canvas.prototype.addEventForGroup = function(selector, button_text, node, group, num_entity, num_category) {
  this.appendPinButton(selector, button_text);
  var _this = this;
  selector.children("#pin_button").on("click", function(e) {
    var query = {};
    var name = node.displayName;
    query.label = name;
    query.data = _this.user_pref_sha + ";"+node.name+';'+num_entity+';'+num_category;
    query.type = group;
    _this.pinEntity(query);
  });
}

Pin2Canvas.prototype.addEventForEntity = function(selector, button_text, query_data) {
  this.appendPinButton(selector, button_text);
  var _this = this;
  if (query_data.isMultiple == undefined || !query_data.isMultiple) {
    selector.children("#pin_button").on("click", function(e) {
      _this.pinEntity(query_data);
    });
  } else {
    var dataset = query_data.data.split(';')[0];
    selector.children("#pin_button").on("click", function(e) {
      var multipleItems = query_data.data.split(';')[1].split(',');
      var len = multipleItems.length;
      while (len--) {
        var query = {};
        query.label = multipleItems[len];
        query.data = _this.user_pref_sha + ";" + multipleItems[len];
        query.type = "PROTEIN";
        _this.pinEntity(query);
      }
    });
  }

}

/**
 * there are two different types of query_data. 1. a group of proteins or a
 * group of patients
 * http://activedata.pnl.gov:8080/bioactive/services/pinx?username=demo&label=Node+6&data=mongoidhere;nodeidhere&type=PROTEIN_GROUP
 * 2. a single entity
 * http://activedata.pnl.gov:8080/bioactive/services/pinx?username=demo&label=NP_000001&data=mongoidhere;nodeidhere&type=PROTEIN
 */
Pin2Canvas.prototype.pinEntity = function(query_data) {
  var _this = this;
  var url = this.host;

  // Add basic query
  if (window.login) {
    query_data.repo = window.login.repo;
    query_data.owner = window.login.owner;
    query_data.branch = window.login.branch;
  }

  $.ajax({
    url: url,
    type: 'GET',
    data: query_data,
    success: function(data, status) {
      if (data.indexOf("Duplicate") > 0) {
        new UserAlerter().notifyMessage('danger', 'Failed!', query_data.type
                + ': ' + query_data.label + ' already pinned to canvas!');
      } else {
        new UserAlerter().notifyMessage('success', 'Pinned!', "pinning for "
                + query_data.type + ": " + query_data.label);
      }
      $('#pinModal').modal('hide');
    },
    complete: function(jqXHR, textStatus) {
      console.log(textStatus);
      $('#pinModal .modal-footer #pinNode').removeAttr("disabled");
    },
    crossDomain: true,
    timeout: 3000,
    error: function(jqXHR, textStatus, errorThrown) {
      if (textStatus === "timeout") {
        new UserAlerter().notifyMessage('danger', 'Failed!', "Pin "
                + query_data.label + ": timeout");
      } else {
        new UserAlerter().notifyMessage('success', 'Pinned!', "pinning for "
                + query_data.type + ": " + query_data.label);
      }
    }
  });
}

// Pin2Canvas.prototype.notifyMessage = function (context, title, message) {
// $(".alert.pin-msg").removeClass('alert-success')
// .removeClass('alert-danger')
// .addClass("alert-" + context)
// .html("<strong>"+title+"</strong> "+message);
// if(!$(".alert.pin-msg").hasClass('in')) {
// $(".alert.pin-msg").toggleClass('in');
// this.timerPinMessage = setTimeout(function() {
// $(".alert.pin-msg").toggleClass('in');
// }, 5000);
// } else {
// // reset setTimeout
// clearTimeout(this.timerPinMessage);
// this.timerPinMessage = setTimeout(function() {
// $(".alert.pin-msg").toggleClass('in');
// }, 5000);
// }
// $('#pinModal .modal-footer #pinNode').removeAttr("disabled");
// }

Pin2Canvas.prototype.setId = function(_id) {
  this.mongodbid = _id;
}

// / initialization
//$(document).ready(function() {
//  window.pin2Canvas = new Pin2Canvas();
//  window.pin2Canvas.setSha(navHeader.user.sha);
//});