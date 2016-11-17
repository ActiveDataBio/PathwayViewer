function KeggPathway(repoPath, id, div_for_pathway, div_for_svg, div_title, node) {
  this.startTime = new Date().getTime();
  this.repoPath = repoPath;
  this.base ="https://adbio.pnnl.gov/bioviz/";
  this.pin2Canvas = new Pin2Canvas();
  this.pathway_id = id;
  this.div_for_pathway = div_for_pathway;
  this.div_for_svg = div_for_svg;
  this.div_title = div_title;
  this.node = node;
  this.rawdata = null;
  this.pathway_genes = null;
  this.metaGraphInfo = null;
  this.proteins = null; // d.gene : gene name (for human) or kegg id
  this.domList = null;
  this.pathway_compounds = null;
  this.isProteinReady = false;
  this.isPathwayReady = false;
  this.isRawDataReady = false;
  this.isGeneNameReady = false;

  this.keggAnimation = null;
  this.newick = null;
  this.keggPhylogram = null;

  this.getRawData();
  this.getPathwayGenes();
  this.getPathwayCompounds();
  this.getMetaGraphInfo();
  this.getNodeProteins();
  
  this.min;
  this.max;
  this.median;
}
KeggPathway.prototype.downloadFile = function(name, success, fail) {
	return $.ajax({
	      url: "git/download",
	      method:"GET",
	      data:{'path':this.repoPath, 'name':name},
	      success:success,
	      error:fail
	    });
	};
KeggPathway.prototype.drawPathway = function() {
  var _this = this;

  var isInPathway = function(entry) {
    var keys = Object.keys(_this.pathway_genes);
    var numKeys = keys.length;
    while (numKeys--) {
      if (keys[numKeys].indexOf(entry)) { return true; }
    }
    return false;
  }

  var getGeneColor = function(d) {
    if (_this.pathway_genes == undefined || _this.entries == '') {
      return d.attributes.bgcolor.value;
    } else {
      var names = d.parentElement.attributes.name.value.split(" ");
      var expressed_entiries_id = Object.keys(_this.entries);
      var len = names.length;
      while (len--) {
        if (isInPathway(names[len])) {
          if (_this.pathway_genes[names[len]] !== undefined) {
            if ((expressed_entiries_id
                    .indexOf(_this.pathway_genes[names[len]]["name"]) > -1) || (expressed_entiries_id
                            .indexOf(names[len].split(':')[1]) > -1)) { return 'red'; }
          } else {
            if (expressed_entiries_id.indexOf(names[len].split(':')[1]) > -1) { return 'red'; }
          }
        }
      }
      return d.attributes.bgcolor.value;
    }
  }

  var saveImage = function(filename, width, svg) {
    $.ajax({
      type: "POST",
      url: "../exporting-server/index.php",
      data: {
        filename: filename,
        type: 'image/png',
        width: width,
        svg: svg.wrap('<p></p>').parent().html()
      }
    }).done(function(o) {
      // console.log(o);
    });
  }
  //creates the basic modal for all popups 
  // d is the data from the pathway.js
  var createModal = function(d,height,head_height,width,mouse_pos){
    x = mouse_pos[0] - width / 2;
    y = mouse_pos[1] - (height + head_height) / 2;
    if (x < 10) x = 10;
    if (y < 10) y = 10;
    
    var modal_content = d3.select("#modal_container").append("div")
    .attr("id", "modal-" + d.parentElement.id)
    .attr("class", "ui modal")
    .attr("name", d.parentElement.attributes.name.value)
    .style("width", (width + 10) + 'px')
    .style("height", (height + head_height) + 'px');
    
    
    modal_content.append("i").attr("class", "close icon");

    var modal_header = modal_content.append("div")
    .attr("class", "header").style("background-color", '#428bca');
    modal_header.append('div').attr('class','text');
    var modal_body = modal_content.append("div").attr("class", "ui content loading")
    .attr("id", "modal-body-" + d.parentElement.id);

    return modal_body;
  };
  var createModalForGraph = function(d, proteins, mouse_pos) {
    var width_buffers = [
                         35, 50, 60
                         ];// amount to increase width based on digit
    // in (n+) text
    var width = 300;// + (proteins.length > 1 ?
    // width_buffers[Math.floor(proteins.length/10)] : 0);
    var height = 400;
    var head_height = 60;
    var action_height = 40;

    var x = 0, y = 0;

    var filteredRawData = _this.rawdata.filter(function(d) {
      var len = proteins.length;
      while (len--) {
        var protein = proteins[len];
        // when rawnames of a dataset were gene names...
        if (d.refseq_id.indexOf(protein.id) > -1 || d.refseq_id
                .indexOf(protein.gene) > -1 || d.refseq_id
                .indexOf(protein.refseq) > -1) { return true; }
      }
      return false;
    });

    var modal_body = createModal(d,height+action_height,head_height,width,mouse_pos);
    modal_body.style({
      "overflow-y": "auto",
      "padding": "0px",
      "padding-top": "5px",
      "padding-bottom": "5px"
        });
    var title = d3.select('#modal-' + d.parentElement.id).select('.header .text');
    var tempArr = Object.keys(_this.pathway_genes).filter(function(d) {
      return _this.pathway_genes[d].kegg == proteins[0].gene;
    });
    var modalName = tempArr ? tempArr[0] : proteins[0].gene;
    modalName = isNaN(modalName) ? modalName : proteins[0].gene;
    if (proteins.length > 1) modalName += ' (' + (proteins.length - 1) + '+)';
    if (d.parentElement.attributes.link != undefined && d.parentElement.attributes.link.value != '') {
      title
      .html('<a href="' + d.parentElement.attributes.link.value + '" style="color:#fff" target=_blank>' + modalName + '</a>');
    } else {
      title.html('<div>' + modalName + '</div>');
    }

    var modal_body_tab = modal_body.append("div")
    .attr("class", "modal-body");
    var pid = d.parentElement.id;
    // phylogram
    if (_this.newick) {
      var html='<div class="ui top attached tabular menu">'+
      '<a class="active item" data-tab="chart'+pid+'">Chart</a>'+
      '<a class="item" data-tab="phylogram'+pid+'">Phylogram</a>'+
      '</div>'+
      '<div class="ui bottom attached active tab segment" data-tab="chart'+pid+'" id="chart_tab'+pid+'"></div>'+
      '<div class="ui bottom attached tab segment" data-tab="phylogram'+pid+'" id="phylogram_tab'+pid+'"></div>';
      modal_body_tab.html(html);

      $("#modal-body-"+pid+" #chart_tab"+pid)
      .drawHighChart({
        target: "#modal-body-"+pid+" #chart_tab"+pid,
        width: width,
        height: height - 40,
        data: filteredRawData,
        metaInfo: _this.metaGraphInfo.info,
        type: _this.metaGraphInfo.type
      });

      d3.phylogram
      .build("#modal-body-"+pid+" #phylogram_tab"+pid, _this.newick, {
        width: 200,
        height: height - 120,
        heatmap: filteredRawData,
        color: _this.color,
        skipLabels: true
      });
      $("#modal-body-"+pid+" .menu .item").tab();
    } else {
      $("#modal-"+pid+" .content").drawHighChart({
        target: "#modal-"+pid+" .content",
        width: width,
        height: height,
        data: filteredRawData,
        metaInfo: _this.metaGraphInfo.info,
        type: _this.metaGraphInfo.type
      });
    }

    var n = d.parentElement.attributes.name.value;
    $("#modal-"+pid).on('mouseover', function(e) {
      $("rect.entry.active[name!='" + n + "']").hide();
      $("path.entry.active[name!='" + n + "']").hide();
    }).on('mouseout', function(e) {
      $("rect.entry.active[name!='" + n + "']").show();
      $("path.entry.active[name!='" + n + "']").show();
    });

    var query = {};
    var label = tempArr.join();
    var identifiers = proteins.map(function(d) {
      return d.refseq?d.refseq:(d.uniprot && d.uniprot.length>0)?d.uniprot:d.id;
    }).join(); 
    query.label = label;
    query.data = /*navHeader.user.sha +*/ ";" + identifiers;
    query.type = "PROTEIN";
    query.isMultiple = true;
    _this.pin2Canvas.addEventForEntity($("#modal-" + d.parentElement.id + " .header .text"), 'Pin', query);

    $("#modal-" + d.parentElement.id + ' #pin_button')
    .on('click', function(e) {
      var len = proteins.length;
      while (len--) {
        var filename = _this.dataset + '-' + proteins[len].refseq;
        saveImage(filename, width, $("#modal-" + d.parentElement.id + " .highcharts-container svg"));
      }
    });
    $("#modal-" + d.parentElement.id+'.ui.content.loading').removeClass('loading');
  }

  var createModalForGene = function(d, mouse_pos) {
    var height = 120;
    var maxHeight = 400;
    var head_height = 60;
    var genes = d.parentElement.attributes.name.value.split(" ");
    var width_buffers = [
                         35, 50, 60
                         ];// amount to increase width based on digit
    // in (n+) text
    var width = 300 + (genes.length > 1 ? width_buffers[Math.floor(genes.length / 10)] : 0);
    var x = 0, y = 0;

    var geneIDs = [];
    for (var i = 0; i < genes.length; i++) {
      geneIDs[i] = genes[i];
    }

    var modal_body = createModal(d,height,head_height,width,mouse_pos);
    var title = d3.select('#modal-' + d.parentElement.id).select('.header .text');
    var tempArr = Object.keys(_this.pathway_genes).filter(function(d) {
      return _this.pathway_genes[d].kegg == geneIDs[0];
    });
    var modalName = tempArr && tempArr.length > 0 ? tempArr[0] : d.attributes.name.value;
    modalName = isNaN(modalName) ? modalName : geneIDs[0];
    if (geneIDs.length > 1) modalName += ' (' + (geneIDs.length - 1) + '+)';
    if (d.parentElement.attributes.link != undefined && d.parentElement.attributes.link.value != '') {
      title
      .html('<a href="' + d.parentElement.attributes.link.value + '" style="color:#fff" target=_blank>' + modalName + '</a>');
    } else {
      title.html('<div>' + modalName + '</div>');
    }
    var modal_list = modal_body.append("p").classed('ui text',true)
    .html("Proteins not present in user dataset:");
    
    var query = {};
    var label = modalName;
    var identifiers = geneIDs.map(function(d){return d.split(':')[1];}).join();
    query.label = label;
    query.data = /*navHeader.user.sha +*/ ";" + identifiers;
    query.type = "PROTEIN";
    query.isMultiple = false;
    _this.pin2Canvas.addEventForEntity($("#modal-" + d.parentElement.id + " .header .text"), 'Pin', query);
//    d.proteinsArr = [];
//    var count = 0; // used to keep track of number of proteins within list, for
//    // li ID purposes
//    for (var i = 0; i < geneIDs.length; i++) {
//      $.ajax({
//        type: "GET",
//        url: "//eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=gene&id=" + geneIDs[i] + "&rettype=gp&retmode=xml",
//        dataType: "xml",
//        success: function(xml) {
//          tempArr = [];
//          $(xml).find('Gene-commentary')
//          .each(function() {
//            var accession = $(this)
//            .find('Gene-commentary_accession').text()
//            for (var i = 0; i < _this.prefixes.length; i++) {
//              if (accession.indexOf(_this.prefixes[i] + '_') > -1 && accession
//                      .lastIndexOf("_") == accession.indexOf("_")) {
//                // console.log(accession);
//                if (d.proteinsArr.indexOf(String(accession)) <= -1) {
//                  d.proteinsArr.push(accession);
//                  tempArr.push(accession)
//                }
//              }
//            }
//          });
//          // console.log(d.proteinsArr);
//          if (modal_list.empty()) console.log("empty?");
//          for (var j = 0; j < tempArr.length; j++) {
//            count++;
//
//            
//            var modal_item = modal_list
//            .append("div")
//            .attr("id", "modal-" + d.parentElement.id + "-" + count)
//            .attr('name', d.parentElement.attributes.name.value).classed('ui item',true);
//            
//            var query = {};
//            var label = tempArr[j];
//            
//            var pin_icon = modal_item.append('i').classed('icon',true);
//            pin_icon.append('img').attr({alt:"Pin", src:"images/pin-16.png"})
//            pin_icon.on('click',function(){
//              
//              
//              query.username = window.login.user.login;
//              query.label = label;
//              query.data = ';'+label;
//              query.type = "PROTEIN";
//              query.isMultiple = false;
//           // Add basic query
//              if (window.login) {
//                query.repo = window.login.repo;
//                query.owner = window.login.owner;
//                query.branch = window.login.branch;
//              }
//
//              $.ajax({
//                url: '/bioactive/services/pinx',
//                type: 'GET',
//                data: query,
//                success: function(data, status) {
//                  if (data.indexOf("Duplicate") > 0) {
//                    new UserAlerter().notifyMessage('danger', 'Failed!', query.type
//                            + ': ' + query.label + ' already pinned to canvas!');
//                  } else {
//                    new UserAlerter().notifyMessage('success', 'Pinned!', "pinning for "
//                            + query.type + ": " + query.label);
//                  }
//                  $('#pinModal').modal('hide');
//                },
//                complete: function(jqXHR, textStatus) {
//                  console.log(textStatus);
//                  $('#pinModal .modal-footer #pinNode').removeAttr("disabled");
//                },
//                crossDomain: true,
//                timeout: 3000,
//                error: function(jqXHR, textStatus, errorThrown) {
//                  if (textStatus === "timeout") {
//                    new UserAlerter().notifyMessage('danger', 'Failed!', "Pin "
//                            + query.label + ": timeout");
//                  } else {
//                    new UserAlerter().notifyMessage('success', 'Pinned!', "pinning for "
//                            + query.type + ": " + query.label);
//                  }
//                }
//              });
//            });
//            
//            
//            modal_item.append("div").classed('content',true).html('<a href="//www.ncbi.nlm.nih.gov/protein/' + tempArr[j] + '" target=_blank>' + tempArr[j] + '</a>');
//
//            height += (height < maxHeight) ? 20 : 0;
//            d3.select("#modal-" + d.parentElement.id)
//            .style("height", (height) + 'px');
//            d3.select("#modal-content-" + d.parentElement.id)
//            .style("height", (height) + 'px');
//            d3.select("#modal-body-" + d.parentElement.id)
//            .style("height", (height - head_height) + 'px');
//
//           
////            pin2Canvas.addEventForEntity($("#modal-" + d.parentElement.id + "-" + count), 'Pin', query);
//            // pin2Canvas.appendKeggButton($("#modal-"+d.parentElement.id+"
//            // .modal-title"), 'Kegg');
//
//            $("#modal-" + d.parentElement.id + '-' + count + ' #pin_button')
//            .on('click', function(e) {
//              /*
//               * var len = genes.length; while (len--) { var
//               * filename = genes[len]; console.log("failename: " +
//               * filename); saveImage(filename, width,
//               * $("#modal-"+d.parentElement.id + "
//               * .highcharts-container svg")); }
//               */
//            });
//
//            d3.select("#modal-" + d.parentElement.id + '-' + count + ' #pin_button')
//            .style("padding", "0px").style("padding-left", "5px")
//            .style("padding-right", "5px")
//            .style("margin-bottom", "5px");
//          }
//          d3.select('#loading_gif_'+d.parentElement.id).style('display','none');
//        }      		
//      });
//    }

    var title = d3.select('#modal-' + d.parentElement.id).select('.modal-title');
    if (d.attributes.name) {
      var modalNameList = d.attributes.name.value.split(",");
      var modalName = modalNameList[0];
    } else
      var modalName = genes[0];

    if (genes.length > 1) modalName += ' (' + (genes.length - 1) + '+)'; 

    if (d.parentElement.attributes.link != undefined && d.parentElement.attributes.link.value != '') {
      title.html('<a href="' + d.parentElement.attributes.link.value + '" style="color:#fff" target=_blank>' + modalName + '</a>');
    } else {
      title.html('<div>' + modalName + '</div>');
    }

    $("#modal-" + d.parentElement.id).draggable({
      handle: ".modal-header"
    });
    $("#modal-" + d.parentElement.id+'.ui.content.loading').removeClass('loading');

  } // ModalForGene

  //example modal for inhibiter all hard coded information and not totally functional
  var createModalForInhibitor = function(d, proteins) {
    var width_buffers = [
                         35, 50, 60
                         ];// amount to increase width based on digit
    // in (n+) text
    var width = 300;// + (proteins.length > 1 ?
    // width_buffers[Math.floor(proteins.length/10)] : 0);
    var height = 350;
    var head_height = 60;

    var x = 0, y = 0;

    if (proteins) var filteredRawData = _this.rawdata.filter(function(d) {
      var len = proteins.length;
      while (len--) {
        var protein = proteins[len];
        // when rawnames of a dataset were gene names...
        if (d.refseq_id.indexOf(protein.id) > -1 || d.refseq_id
                .indexOf(protein.gene) > -1) { return true; }
      }
      return false;
    });

    if (d.attributes.type.value == 'line') {
      var coords = d.attributes.coords.value.split(',');
      x = (+coords[0]) - width / 2;
      y = d.parentElement.offsetTop + (+coords[1]) - (height + head_height);
    } else { // rectangle, circle, roundrectangle
      x = (+d.attributes.x.value) - width / 2 + 220;
      y = d.parentElement.offsetTop + (+d.attributes.y.value) - (height + head_height) - (+d.attributes.height.value) + 20;
    }
    // if modal is out of bound, fix the position to be inside
    if (x < 20) x = 20;
    if (y < 20) y = 20;
    var modal_content = d3.select("#" + _this.div_for_svg).append("div")
    .attr("id", "modal-Inhibitor_" + d.parentElement.id)
    .attr("class", "modal fade modal-Inhibitor_" + d.parentElement.id)
    .style("position", 'absolute').style("width", (width + 10) + 'px')
    .style("height", (height + head_height) + 'px')
    .style("left", x + "px").style("top", y + "px")
    .style("overflow", "hidden").append("div")
    .attr("class", "modal-dialog modal-sm").style("margin", '0px')
    .append("div").attr("class", "modal-content");

    var modal_header = modal_content.append("div")
    .attr("class", "modal-header").style("background-color", '#428bca');

    modal_header.append("button").attr("type", "button").attr("class", "close")
    .attr("data-dismiss", "modal").attr("aria-hidden", "true")
    .html('&times;');

    var title = modal_header.append("h4").attr("class", "modal-title")
    .style("font-size", '16px');


    var tempArr = d.attributes.name.value.split(", ");
    title.html('<a style="color:#fff">' + tempArr[0] + '</a>');


    var modal_body = modal_content.append("div").attr("class", "modal-body");
    console.log(d.parentElement);
    console.log(proteins);
    // modal_body.append('p').text('Perturbation:');
    // modal_body.append('p').text('Experiments:');
    modal_body.append('p')
    .text('Gene Description: epidermal growth factor receptor');
    var formGroup = modal_body.append("form").attr({
      "id": "multiselectForm",
      "method": "post"
    }).classed("form-horizontal", true);
    var selectGroup = formGroup.append("div").classed("form-group", true)
    selectGroup.append('label').classed("control-label", true)
    .classed("multiSelect-" + d.parentElement.id, true)
    .text("Perturbations");
    var perturbations = selectGroup
    .append("select")
    .classed("form-control", true)
    .attr({
      "id": "multiSelectPerturbations",
      "name": "perts",
      "multiple": "multiple"
    })
    .selectAll("options")
    .data([
           "Afatinib", 'Erlotinib', 'Gefitinib', "siRNA knockdown", "over-expression"
           ]);

    perturbations.enter().append('option').attr({
      "value": function(d) {
        return d;
      }
    }).text(function(d) {
      return d;
    });

    var selectGroup = formGroup.append("div").classed("form-group", true)
    selectGroup.append('label').classed("control-label", true)
    .classed("multiSelect-" + d.parentElement.id, true)
    .text("Cell lines");
    var Cell_lines = selectGroup.append("select").classed("form-control", true)
    .attr({
      "id": "multiSelectCell_lines",
      "name": "Cell_lines",
      "multiple": "multiple"
    }).selectAll("options").data(["Afatinib", 'Erlotinib', 'Gefitinib']);

    Cell_lines.enter().append('option').attr({
      "value": function(d) {
        return d;
      }
    }).text(function(d) {
      return d;
    });
    var selectGroup = formGroup.append("div").classed("form-group", true)
    selectGroup.append('label').classed("control-label", true)
    .classed("multiSelect-" + d.parentElement.id, true).text("Assays");
    var Assays = selectGroup.append("select").classed("form-control", true)
    .attr({
      "id": "multiSelectAssays",
      "name": "Assays",
      "multiple": "multiple"
    }).selectAll("options").data([
                                  "Afatinib", 'Erlotinib', 'Gefitinib'
                                  ]);

    Assays.enter().append('option').attr({
      "value": function(d) {
        return d;
      }
    }).text(function(d) {
      return d;
    });

    $("#multiSelectPerturbations").multiselect({
      enableCaseInsensitiveFiltering: true
    });
    $("#multiSelectCell_lines").multiselect({
      enableCaseInsensitiveFiltering: true
    });
    $("#multiSelectAssays").multiselect({
      enableCaseInsensitiveFiltering: true
    });


    $("#modal-Inhibitor_" + d.parentElement.id).draggable({
      handle: ".modal-header"
    });

    $("#modal-Inhibitor_" + d.parentElement.id).on('mouseover', function(e) {
      $("rect.entry.active[eid!='" + d.parentElement.id + "']").css("fill", "white");
      $("path.entry.active[eid!='" + d.parentElement.id + "']").css("stroke", "white");
    }).on('mouseout', function(e) {
      $("rect.entry.active[eid!='" + d.parentElement.id + "']").css("fill", "red");
      $("path.entry.active[eid!='" + d.parentElement.id + "']").css("stroke", "red");
    });

    var query = {};
    var label = tempArr.join() || "";
    var identifiers = ""// proteins.map(function (d){ return d.refseq ? d.refseq
      // : d.uniprot; }).join();
      query.username = "demo";
    query.label = label;
    query.data = _this.dataset + ";" + identifiers;
    query.type = "PROTEIN";
    query.isMultiple = true;
    $("<button>").attr("class", 'btn btn-default').css("margin-left", "10px")
    .html("Select Experiments").appendTo($("#modal-Inhibitor_" + d.parentElement.id + " .modal-title"));

  } // /end createModalForBlocker

  var clickEntry = function(d) {
    var mouse_pos = d3.mouse(this);
    if (d.parentElement.attributes.type.value == 'gene' || d.parentElement.attributes.type.value == 'ortholog') {
      if ($("#modal-" + d.parentElement.id).length == 0 && $(".modal[name='" + d.parentElement.attributes.name.value + "']").length == 0) {
        // get the list of proteins related to this reaction (rectangle or line)
        var names = d.parentElement.attributes.name.value.split(" ");
        var proteins = _this.proteins.filter(function(e) {
          var len = names.length;
          while (len--) {
            var geneId = e.gene;
            if (_this.pathway_genes.hasOwnProperty(e.gene)) {
              geneId = _this.pathway_genes[e.gene]['kegg'].split(':')[1];
            }
            if (geneId == names[len]) { return true; }
          }
          return false;
        });
        if (proteins.length > 0) {
          createModalForGraph(d, proteins, mouse_pos);
        } else {
          createModalForGene(d, mouse_pos);
        }
      }
      $(".modal[name='" + d.parentElement.attributes.name.value + "']").modal({
        detachable:false,
        allowMultiple:true,
        dimmerSettings: {
          cloasable:false
        }, 
        offset:20
      }).modal('show').modal('hide dimmer').draggable({handle: ".header",stack:'.ui.modal.ui-draggable'});
      return;
    } else if (d.parentElement.attributes.type.value === "map") {
      var query = window.location.search;
      var params = query.substring(1).split('&');
      var new_id = d.parentElement.attributes.link.value.split("?")[1];
      if (new_id.indexOf("map") >= 0) {
        new_id = new_id.replace("map","");
        var old_id;
        var obj = {};
        params.forEach(function(keyValue) {
          var parts = keyValue.split('=')
          obj[parts[0]] = parts[1];
          if (parts[0] === "id") old_id = parts[1].match(/\d+/)[0];
        })
        obj["id"] = new_id;
        window.open(window.location.href.replace(old_id, new_id));
      }
    }
  }

  var menu = [
              {
                title: function(d) {
                  if (d.parentElement.attributes.type.value == 'gene') {
                    var names = d.parentElement.attributes.name.value.split(" ");
                    var len = names.length;
                    var i = 0;
                    var title = '';
                    while (i < len) {
                      if (i < 5) title += names[i];// .name;
                      if ((i < len - 1) && i < 4) title += ', ';
                      if (i == len - 1 && i >= 5) title = title + ' (+' + (len - 5)
                      .toString() + ')';
                      i++;
                    }
                    return title;
                  }
                },
                action: function(elm, d, i) {
                  console.log(d.parentElement.attributes.name.value.split(" "));
                  console.log(elm);
                  console.log(d);
                  console.log(i);
                }
              },
              /*
               * { title: 'Pin to Canvas', action: function(elm, d) { var query = {};
               * query.username = "demo"; query.label =
               * d.parentElement.attributes.name.value; query.data = "mongodbid;" +
               * d.parentElement.attributes.name.value; query.type = "PROTEIN";
               * pin2Canvas.pinEntity(query); } },
               */// Currently non-functional. Attempts to pin a list of protein names
              // as a single PROTEIN. Suggest either pinning as PROTEINGROUP or
              // splitting and pinning multiple PROTEINS
              {
                title: 'Visit KEGG',
                action: function(elm, d) {
                  window.open(d.parentElement.attributes.link.value, '_blank');
                }}];
  var kgmlTime = performance.now();
  
   
  $.ajax({
    url: this.base+"services/kgml/" + _this.pathway_id,
    type: 'POST',
    data: {
      owner: 'demo' // TODO
    },
    error: function(data, status, c) {
      console.log(data);
      console.log(status);
      console.log(c);

    },
    success: function(data, status) {
      console.log("got kgml from server and it took " + (performance
              .now() - kgmlTime) + "ms");
      var mouseover = function(p) {
      }

      var mouseout = function() {
      }

      var getPath = function(entry_id1, entry_id2) {
        var x1 = $("entry#" + entry_id1 + " graphics").attr("x");
        var x2 = $("entry#" + entry_id2 + " graphics").attr("x");
        var y1 = $("entry#" + entry_id1 + " graphics").attr("y");
        var y2 = $("entry#" + entry_id2 + " graphics").attr("y");
        return "M" + x1 + "," + y1 + " L" + x2 + "," + y2 + "";
      }

      var getImgSize = function(imgSrc) {
        var sTime = performance.now();
        var newImg = new Image();

        newImg.onload = function() {
          var height = newImg.height;
          var width = newImg.width;
          console.log('The image size is ' + width + '*' + height);

          $("#button-container").css({
            'left': (width - 483) + "px",
            "display": "block"
          });

          // set svg size and image size
          $("#" + _this.div_for_svg + " svg").attr("width", width);
          $("#" + _this.div_for_svg + " svg").attr("height", height);
          $("#" + _this.div_for_svg + " image").attr("width", width);
          $("#" + _this.div_for_svg + " image").attr("height", height);
          console.log("Image loaded: " + (performance.now() - sTime) + " milliseconds.");
          
          $('.loading.segment').removeClass('loading');
        }

        newImg.src = imgSrc; // this must be done AFTER setting onload
      }

      $("#" + _this.div_for_pathway).html(data);

      if ($("pathway").length === 0) {
        $("#" + _this.div_title)
        .html(_this.pathway_id + " is not available.");
      }

      $("#" + _this.div_title)
      .html($("pathway").attr("title") + " <span class=\"glyphicon glyphicon-info-sign\" style=\"font-size: small;\"></span>");

      getImgSize($("pathway").attr("image"));
      var svg = d3.select("#" + _this.div_for_svg).append("svg")
      .attr("width", 0).attr("height", 0).append("g");

      var imagePath = $("pathway").attr("image");
      var org = $("pathway").attr("org");
      var re = new RegExp(org, 'g');
      imagePath = imagePath.replace(re, 'map');

      svg.append("image").attr("width" , window.screen.width).attr("height", window.screen.height)
      .attr("xlink:href", imagePath);

      // for genes in rects
      var entry = svg
      .selectAll("rect.entry")
      .data($("entry[type='gene'] graphics[type='rectangle'],entry[type='ortholog'] graphics[type='rectangle']"))
      .enter()
      .append("rect")
      .attr("class", "entry")
      .attr("eid", function(d) {
        return d.parentElement.id;
      })
      .attr("name", function(d) {
        return d.parentElement.attributes.name.value;
      })
      .attr("x", function(d) {
        return Math.ceil(+d.attributes.x.value - d.attributes.width.value / 2)+1;
      })
      .attr("y", function(d) {
        return Math.ceil(+d.attributes.y.value - d.attributes.height.value / 2);
      }).attr("width", function(d) {
        return (+d.attributes.width.value)-1;
      }).attr("height", function(d) {
        return (+d.attributes.height.value)-1;
      }).attr("data-variation", "tooltip")
      .attr("data-placement", "top")
      .attr("data-title", function(d) {
        return d.parentElement.attributes.name.value;
      })
      .attr("data-content", function(d) {
        return d.attributes.name.value;
      }).style("fill", 'white').style("color", function(d) {
        return d.attributes.fgcolor.value;
      }).text(function(d) {
        return d.attributes.name.value;
      }).on("click", clickEntry).on("mouseover", mouseover)
      .on("mouseout", mouseout).on('contextmenu', d3
              .keggMenu(menu)); // attach menu to element;

      // for genes in lines
      var entry = svg
      .selectAll("path.entry")
      .data($("entry[type='gene'] graphics[type='line'],entry[type='ortholog'] graphics[type='line']"))
      .enter().append("path").attr("class", "entry")
      .attr("eid", function(d) {
        return d.parentElement.id;
      }).attr("name", function(d) {
        return d.parentElement.attributes.name.value;
      }).attr("d", function(d) {
        var rst = 'M ';
        var coords = d.attributes.coords.value.split(',');
        var i = 0;
        while (i < coords.length) {
          if (i > 0) rst += 'L '
            rst += coords[i] + ' ' + coords[i + 1];
          if (i < coords.length - 2) rst += ' ';
          i += 2;
        }
        return rst;
      }).attr("data-variation", "tooltip")
      .attr("data-placement", "top")
      .attr("data-title", function(d) {
        return d.parentElement.attributes.name.value;
      }).attr("data-content", function(d) {
        return d.attributes.name.value;
      }).style("stroke", 'white').style("fill", 'none')
      .style("stroke-width", '5').text(function(d) {
        return d.attributes.name.value;
      }).on("click", clickEntry).on("mouseover", mouseover)
      .on("mouseout", mouseout).on('contextmenu', d3
              .keggMenu(menu)); // attach menu to element;

      var entry = svg
      .selectAll("rect.roundRec")
      .data($("entry[type='map'] graphics[type='roundrectangle']"))
      .enter()
      .append("rect")
      .attr("class", "roundRec")
      .attr("eid", function(d) {
        return d.parentElement.id;
      })
      .attr("name", function(d) {
        return d.parentElement.attributes.name.value;
      })
      .attr("x", function(d) {
        return +d.attributes.x.value - d.attributes.width.value / 2;
      })
      .attr("y", function(d) {
        return +d.attributes.y.value - d.attributes.height.value / 2;
      })
      .attr("width", function(d) {
        return d.attributes.width.value;
      })
      .attr("height", function(d) {
        return d.attributes.height.value;
      })
      .attr("data-variation", "tooltip")
      .attr("data-placement", "top")
      .attr("data-title", function(d) {
        return d.parentElement.attributes.name.value;
      })
      .attr("data-content", function(d) {
        return d.attributes.name.value;
      })
      .classed('entry', function(d) {
        return d.parentElement.attributes.link.value.split("?")[1]
        .indexOf("map") >= 0;
      })
      .style("fill", function(d) {
        return (d.parentElement.attributes.link.value.split("?")[1]
        .indexOf("map") >= 0) ? 'white' : "none";
      }).style("color", function(d) {
        return d.attributes.fgcolor.value;
      }).text(function(d) {
        return d.attributes.name.value;
      }).on("click", clickEntry).on("mouseover", mouseover)
      .on("mouseout", mouseout).on('contextmenu', d3
              .keggMenu(menu)); // attach menu to element;

      // for cpd in circle
      var entry = svg.selectAll("circle.compound")
      .data($("entry[type='compound'] graphics[type='circle']"))
      .enter().append("circle").attr("class", "compound entry")
      .attr("eid", function(d) {
        return d.parentElement.id;
      }).attr("name", function(d) {
        return d.parentElement.attributes.name.value;
      }).attr("cx", function(d) {
        return +d.attributes.x.value;
      }).attr("cy", function(d) {
        return +d.attributes.y.value;
      }).attr("r", function(d) {
        return d.attributes.width.value / 2;
      }).attr("height", function(d) {
        return d.attributes.height.value / 2;
      }).attr("data-variation", "tooltip")
      .attr("data-placement", "top")
      .attr("data-content", function(d) {
        return d.attributes.name.value;
      })
      .attr("data-title", function(d) {
        return d.parentElement.attributes.name.value;
      }).style("fill", '#efefef').style("color", function(d) {
        return d.attributes.fgcolor.value;
      }).text(function(d) {
        return d.attributes.name.value;
      }).on("click", clickEntry).on("mouseover", mouseover)
      .on("mouseout", mouseout).on('contextmenu', d3
              .keggMenu(menu)); // attach menu to element;
      // /////////////////////////////// set zoom properties
      // /////////////////////////
      var width = $("#" + _this.div_for_svg + " svg").attr("width");
      var height = $("#" + _this.div_for_svg + " svg").attr("height");

      _this.isPathwayReady = true;
      console.log("pathway is displayed");
      console
      .log("processed pathway that took " + (performance.now() - kgmlTime) + "ms");
      if (_this.isReady()) _this.highlightProteins();

      // tooltips
      $('.entry[data-variation="tooltip"]').popup({debug:true});
    }
  });
};

KeggPathway.prototype.getNodeProteins = function() {
  var _this = this;
  var selected_leaves = [];
  var startTimeProteins = performance.now();
  function findNode(source, name) {
    if (source.name == name) {
      return source;
    } else {
      if (source.children) {
        var len = source.children.length;
        while (len--) {
          var node = findNode(source.children[len], name);
          if (node) return node;
        }
      } else
        return null;
    }
  }

  function findLeaves(node) {
    if (node.children) {
      var len = node.children.length;
      while (len--) {
        findLeaves(node.children[len]);
      }
    } else {
      selected_leaves.push(node.name.split('.')[0]);
    }
  }

  this.downloadFile("dendro_row.json", function(data) {
    
    if (data) {
      var node = findNode(jQuery.parseJSON(data), _this.node);
      findLeaves(node);
      _this.downloadFile("background.csv", function(data) {
       if (data) {
          _this.proteins = d3.csvParse(data);

          _this.prefixes = [];
          _this.proteins = _this.proteins.filter(function(d) {
            var idx = selected_leaves.indexOf(d.id
                    .split('.')[0]);
            if (idx >= 0) {
              selected_leaves.splice(idx, 1);
              var split = d.id.split('.')[0];
              if (_this.prefixes.indexOf(split.substring(0, split .indexOf('_'))) <= -1) {
                _this.prefixes.push(split.substring(0, split.indexOf('_')));
              }
              return true;
            } else
              return false;
          });
          _this.proteins .forEach(function(d) {
            if (_this.proteinsMap === undefined) _this.proteinsMap = {};
            _this.proteinsMap[d.id] = d;
          });
          _this.isProteinReady = true;
          console.log("all proteins of this node are retrieved: " + (performance .now() - startTimeProteins) + " milliseconds.");
          if (_this.isRawDataAndProteinReady()){
            //_this.mergeRawData();
            _this.filterRawData();
          }
          if (_this.isReady()) _this.highlightProteins();
        }

      },function(err){ if (err) {
      alert(err);
      return;
    }});
    }}
    ,function (err) {
        alert(err);
        return;
      }
  );
};

KeggPathway.prototype.getRawData = function() {
  var _this = this;
  var startTimeRaw = performance.now();
  this.downloadFile("matrix.csv", function(data) {
    
    if (data) {
      var matrix = d3.csvParse(data);
      var col = matrix.length;
      _this.rawdata = [];
      while (col--) {
        var column = matrix[col];
        var uniqueData = Object.keys(column);
        var raw = uniqueData.length;
        while (raw--) {
          var id = uniqueData[raw];
          if (id == "") continue;
          _this.rawdata.push({
            "refseq_id": id,
            "sample_id": column[""],
            "value": isNaN(+column[id]) ? null : +column[id]
          });
        }
      }
      
      // set up the color scale
      _this.color = adbio.color.get(_this.rawdata.map(function(d){return d.value;}), colorbrewer.RdYlBu[5].reverse());
//      _this.min = d3.min(_this.rawdata.map(function(d){return d.value;}));
//      _this.max = d3.max(_this.rawdata.map(function(d){return d.value;}));
//      _this.median = d3.median(_this.rawdata.filter(function(d){return d.value>_this.min && d.value<_this.max;}).map(function(d){return d.value;}));
//      var _domain = [ _this.min, (_this.min + _this.median) / 2, _this.median, (_this.max + _this.median) / 2, _this.max ];
//      _this.color = d3.scale.linear().domain(_domain).range(colorbrewer.RdYlBu[5].reverse());
      console.log("raw data of this node are retrieved: " + (performance.now() - startTimeRaw) + " milliseconds.");
      _this.isRawDataReady = true;
      if (_this.isRawDataAndProteinReady()) _this.filterRawData();
      if (_this.isReady()) _this.highlightProteins();
    }
  },function(err){
	  if (err) {
  
      alert(err);
      return;
    }
  });
};
KeggPathway.prototype.getPathwayCompounds = function(){
  var _this = this;
  var startTimeCompounds = performance.now();
  $.ajax({
    url: this.base+"services/Compounds/" + _this.pathway_id,
    type: 'GET',
    async:false,
    crossDomain: true,
    dataType: 'json'
  }).done(function(compounds, textStatus, jqXHR){
    if(jqXHR.status != 200) return;
    var pathway_compounds = {};
    var len = compounds.length;
    while(len--){
      var name = compounds[len].compound_id.split(";")[0].split(",")[0];
      pathway_compounds[name] = {};
      pathway_compounds[name]['desc'] = compounds[len].formula;
      pathway_compounds[name]['kegg'] = compounds[len].compound_id;
    }
    _this.pathway_compounds = pathway_compounds;
  }).fail(function(err,msg){
    //Nothing to do here
  });
  
}
KeggPathway.prototype.getPathwayGenes = function() {
  var _this = this;
  var startTimePath = performance.now();
  $.ajax({
    url: this.base+"services/genes/" + _this.pathway_id,
    type: 'GET',
    async:false,
    crossDomain: true,
    dataType: 'json',
    success: function(genes, status,jqXHR) {
      if(jqXHR.status != 200) return;
      console.log("got the genes from server: " + (performance.now() - startTimePath) + " milliseconds.");
      console.log(genes.length);
      var geneList = genes;
      var pathway_genes = {};
      var geneIds = Object.keys(geneList);
      var len = geneIds.length;
      while (len--) {
        var geneId = geneIds[len];
        var name = geneList[geneId].split(";")[0].split(",")[0];
        pathway_genes[name] = {};
        pathway_genes[name]['desc'] = geneList[geneId];
        pathway_genes[name]['kegg'] = geneId;
      }
      _this.pathway_genes = pathway_genes;
      console.log("all pathway genes are retrieved: " + (performance.now() - startTimePath) + " milliseconds.");
      _this.isGeneNameReady = true;
      if (_this.isReady()) _this.highlightProteins();
    },
    error: function(error, status) {
      setTimeout(function() {
        console.log($("#pathway > svg")[0]);
        d3.select("#pathway").select("svg").append('text').attr({
          "x": 310,
          "y": 40,
          "fill": "red",
          "font-size": "30px"
        }).html("Error getting kegg data!");
      }, 4000);
    }
  });
};

KeggPathway.prototype.getMetaGraphInfo = function() {
  var _this = this;
  var metadata;
  var metaconfig;
  var ready = 0;

  var generateMetaGraphInfo = function() {
    // find the column name of unique ids
    var uniqueColName = 'id';

    // find group/timeline info
    _this.metaGraphInfo = {};
    if (metadata[0].hasOwnProperty("timeline") && metadata[0].hasOwnProperty("group")) {
      _this.metaGraphInfo.type = 'timeline';
      // set animation
      _this.keggAnimation = new KeggAnimation();
    } else if (metadata[0].hasOwnProperty("group")) {
      _this.metaGraphInfo.type = 'cohort';
    } else {
      _this.metaGraphInfo.type = 'default';
    }

    // if there is phylogeny information
    if (metadata[0].hasOwnProperty("phylogeny")) {
      _this.downloadFile('phylogeny.nw', function(data) {
        if (data) {
          _this.newick = Newick.parse(data);
          var newickNodes = [];
          var idx = 0;
          function buildNewickNodes(node, callback) {
            newickNodes.push(node);
            if (node.children) {
              for (var i = 0; i < node.children.length; i++) {
                buildNewickNodes(node.children[i])
              }
            }
          }
          buildNewickNodes(_this.newick);
          console.log('newick file is loaded');
          if (_this.isReady()) _this.getPhylogeny(_this.color);
        } 
      },function(err){
    	  if (err) {
              console.log(err);
              return;
            }
      });
    }

    _this.metaGraphInfo.info = {};
    len = metadata.length;
    while (len--) {
      var sampleId = metadata[len][uniqueColName];
      _this.metaGraphInfo.info[sampleId] = {};
      if (metadata[len].hasOwnProperty("timeline")) _this.metaGraphInfo.info[sampleId].timeline = metadata[len].timeline;
      if (metadata[len].hasOwnProperty("group")) {
        _this.metaGraphInfo.info[sampleId].group = metadata[len].group;
      }
      if (metadata[len].hasOwnProperty("phylogeny")) _this.metaGraphInfo.info[sampleId].phylogeny = metadata[len].phylogeny;
    }
  }

  this.downloadFile('metadata.tsv', function(data) {
   
    if (data) {
      metadata = d3.tsvParse(data);
      metaconfig = metadata.filter(function(d) {
        return d.id.indexOf('#') == 0;
      });
      metadata = metadata.filter(function(d) {
        return d.id.indexOf('#') < 0;
      });

      generateMetaGraphInfo();
    } 
  },function(err){
	  if (err) {
	      alert(err);
	      return;
	  }
  });
};

KeggPathway.prototype.isReady = function() {
  return this.isPathwayReady && this.isRawDataAndProteinReady() && this.isGeneNameReady;
}

KeggPathway.prototype.isRawDataAndProteinReady = function() {
  return this.isRawDataReady && this.isProteinReady;
}
KeggPathway.prototype.highlightCompounds = function(){
  var startTimeHighlight = performance.now();

  var pathway_compoundss = this.pathway_genes;
  var genes = Object.keys(pathway_compoundss).map(function(d) {
    var temp = [];
    temp.kegg = pathway_compoundss[d].kegg;
    temp.name = d;
    return temp
  });
  this.proteins = this.proteins.filter(function(d) {
    var filtered = genes.filter(function(g) {
      if (d.gene == "" || d.gene == undefined)
        return false;
      else
        return g.kegg.indexOf(d.gene) >= 0 || g.name.indexOf(d.gene) >= 0;
    })
    if (filtered.length > 0) {
      d.gene = filtered[0].kegg;
      return true;
    }
    return false;
  });
}
KeggPathway.prototype.highlightProteins = function() {
//$('.modal.loading').modal('hide');

  var startTimeHighlight = performance.now();
  var pathway_genes = this.pathway_genes;
  var genes;
  var matches = this.proteins[0].gene.match(/(?:C|D)\d{5}/);
  if(matches && matches.length > 0){
    pathway_genes = this.pathway_compounds;
    genes= Object.keys(pathway_genes).map(function(d) {
      var temp = [];
      temp.kegg = pathway_genes[d].kegg;
      temp.name = d;
      return temp
    });
  }else{
  
    genes= Object.keys(pathway_genes).map(function(d) {
      var temp = [];
      temp.kegg = pathway_genes[d].kegg;
      temp.name = d;
      return temp
    });
  }

  this.proteins = this.proteins.filter(function(d) {
    var filtered = genes.filter(function(g) {
      if (d.gene == "" || d.gene == undefined)
        return false;
      else
        return g.kegg.indexOf(d.gene) >= 0 || g.name.indexOf(d.gene) >= 0;
    })
    if (filtered.length > 0) {
      d.gene = filtered[0].kegg;
      return true;
    }
    return false;
  });

  var len = this.proteins.length;
  this.domList = [];
  var moleculars = [];
  var i = 0;
  while (len > i) {
    var protein = this.proteins[i];
    var temp = $("#" + this.div_for_svg + " rect.entry[name~='" + protein.gene + "']")
    .css("fill", "red").attr("class", "entry active");
    if (temp.length > 0) {
      this.domList.push(temp);
      moleculars.push(protein);
    }
    temp = $("#" + this.div_for_svg + " path.entry[name~='" + protein.gene + "']")
    .css("stroke", "red").attr("class", "entry active");
    if (temp.length > 0) {
      this.domList.push(temp);
      moleculars.push(protein);
    }
    if (this.pathway_genes && this.pathway_genes.hasOwnProperty(protein.gene)) {
      console
      .log($("#" + this.div_for_svg + " rect.entry[name~='" + this.pathway_genes[protein.gene]['kegg'] + "']"));
      temp = $("#" + this.div_for_svg + " rect.entry[name~='" + this.pathway_genes[protein.gene]['kegg'] + "']")
      .css("fill", "red").attr("class", "entry active");
      if (temp.length > 0) {
        this.domList.push(temp);
        moleculars.push(protein);
      }
      temp = $("#" + this.div_for_svg + " path.entry[name~='" + this.pathway_genes[protein.gene]['kegg'] + "']")
      .css("stroke", "red").attr("class", "entry active");
      if (temp.length > 0) {
        this.domList.push(temp);
        moleculars.push(protein);
      }
    }
    if(this.pathway_compounds && this.pathway_compounds.hasOwnProperty(protein.gene)){
      temp= $("#"+ this.div_for_svg + " circle.entry[name~='cpd:"+protein.gene+"']")
        .css("fill", "red").attr("class", "entry active");
      if (temp.length > 0) {
        this.domList.push(temp);
        moleculars.push(protein);
      }
      temp= $("#"+ this.div_for_svg + " circle.entry[name~='ko:"+protein.gene+"']")
      .css("fill", "red").attr("class", "entry active");
      if (temp.length > 0) {
        this.domList.push(temp);
        moleculars.push(protein);
      }
    }
    i++;
  }

  this.mergeRawData();

  // animation
  // phylogram
  console.log('is there a newick file?');
  if (this.newick) this.getPhylogeny(this.color);

  if (this.keggAnimation) {
    this.keggAnimation.setColor(this.color);
    this.keggAnimation.setData(this.domList, moleculars, this.rawdata, this.metaGraphInfo);
    this.keggAnimation.setPhylogram(this.keggPhylogram);
  }

  // make a group selector
  var _this = this;
  var groups = [];
  if (this.metaGraphInfo.type == 'cohort' || this.metaGraphInfo.type == 'timeline') {
    groups = Object.keys(this.metaGraphInfo.info).map(function(d) {
      return _this.metaGraphInfo.info[d].group;
    });
  } else {
    groups = Object.keys(this.metaGraphInfo.info).map(function(d) {
      return d;
    });
  }
  groups = d3.set(groups).values().sort();
  var f = true;
  var fg;
  groups.forEach(function(d,index) {
    var sampleName = d.replace('.', '\\.'); // '.' -> '\\.' because of the class
    // selector
    var vals = _this.rawdata.filter(function(e) {return e.sampleMeta.group==d && e.value!=null;});
    var html = '';
    if(vals.length == 0) {
      html = '<div class="disabled item" data-value="' + d + '">' + d + '</div>';
    } else {
      html = '<div class="item'+ (f?' active':'')+'" data-value="' + d + '">' + d + '</div>';
      if(f){
        fg = d;
        $('#pathway-controller .ui.dropdown .text').html(d);
      }
      f = false;
    }
    
//    var html = '<div class="item'+ (index==0?' active':'')+'" data-value="' + d + '">' + d + '</div>';
    $('#pathway-controller .ui.dropdown .menu').append(html);
    
  });
  $('#pathway-controller .ui.dropdown').dropdown({
    onChange: function(v){
      _this.setGroup(v, _this.domList)}

  });
  this.setGroup(fg, this.domList);
  if(groups && groups.length > 1){
    $('#pathway-controller .ui.group').show();
  }
//$('#pathway-controller .select-group button').html(groups[0] + ' <span class="caret"></span>');
  console.log('highlightProteins took ' + (performance.now() - startTimeHighlight) + " milliseconds.");
}

KeggPathway.prototype.getPhylogeny = function(c) {
  console.log('there is a newick file');
  this.keggPhylogram = d3.phylogram;
  this.keggPhylogram.build('#phylogram', this.newick, {
    width: 100,
    height: 400,
    heatmap: this.rawdata,
    color: c,
    skipLabels: true,
    duration: 1000
  });
}

KeggPathway.prototype.filterRawData = function() {
  var _this = this;
  var startTimeFilter = performance.now();
  this.rawdata = this.rawdata.filter(function(d) {
    var refseq = d.refseq_id;
    return (_this.proteinsMap[refseq] != undefined);
  });
  console.log('filterRawData took ' + (performance.now() - startTimeFilter) + " milliseconds.");
}

KeggPathway.prototype.setGroup = function(group, dom) {
  var _this = this;
  if (_this.keggAnimation) {
    _this.keggAnimation.setGroup(group);
  } else {
    // to get the samples of a group
    var colarr = [];
    Object.keys(this.metaGraphInfo.info).forEach(function(d) {
      if (_this.metaGraphInfo.info[d].group == group) colarr.push(d);
    });
    // to filter out the rawdata for a specific group
    var f_rawdata = this.rawdata.filter(function(d) {
      return colarr.indexOf(d.sample_id) >= 0;
    });

    var keggObjects = [];
    dom.forEach(function(d, i) {
      var mol = _this.proteins[i];
      d.each(function(idx, x) {
        var eid = x.getAttributeNode('eid').value;
        if (keggObjects[eid] == undefined) {
          keggObjects[eid] = [mol.id];
        } else {
          if (keggObjects[eid].indexOf(mol.id) < 0) keggObjects[eid]
          .push(mol.id);
        }
      });
    });
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
    keggObjects.forEach(function(d, eid) {
      // molecular selection
      var entries = $('#pathway .entry[eid="' + eid + '"]');
      var data = f_rawdata
      .filter(function(e) {
        return (d.indexOf(e.molecule_id) >= 0 && colarr
                .indexOf(e.sample_id) >= 0);
      })
      if (data) {
        var val = d3.mean(data.map(function(k) {
          return k.value;
        }));
        var color = adbio.color.na;
        if (val != undefined) color = rgbToHex(_this.color(val));
        entries.each(function(index, value) {
          if (value.nodeName == 'rect')
            $(value).velocity({
              'fill': color
            },colorbrewer.RdYlBu[5].reverse()); 
          else if (value.nodeName == 'path') $(value).velocity({
            'stroke': color
          }, colorbrewer.RdYlBu[5].reverse());
          else if (value.nodeName == 'circle'){
//            $(value).velocity({
//              'fill': color
//            },colorbrewer.RdYlBu[5].reverse());
            $(value).attr('r',8);
          }
        });
      }
    });
  }
}

KeggPathway.prototype.filterRawData = function() {
  var _this = this;
  var startTimeFilter = performance.now();
  this.rawdata = this.rawdata.filter(function(d) {
    var refseq = d.refseq_id;
    return (_this.proteinsMap[refseq] != undefined);
  });
  console.log('filterRawData took ' + (performance.now() - startTimeFilter) + " milliseconds.");
}

KeggPathway.prototype.mergeRawData = function() {
  var _this = this;
  var startTimeFilter = performance.now();
  var proteinIds = this.proteins.map(function(d) {
    return d.id;
  });

  this.rawdata = this.rawdata.filter(function(d) {
    var id = d.refseq_id;
    return (proteinIds.indexOf(id) >= 0);
  });

  this.rawdata.forEach(function(d) {
    d.molecule_id = d.refseq_id;
    d.sampleMeta = _this.metaGraphInfo.info[d.sample_id];
    d.moleculeMeta = _this.proteins[proteinIds.indexOf(d.refseq_id)];
    if (d.sampleMeta.phylogeny)
      d.phylogeny = d.sampleMeta.phylogeny;
    else if (d.moleculeMeta.phylogeny) d.phylogeny = d.moleculeMeta.phylogeny;
  });

  console.log('mergeRawData took ' + (performance.now() - startTimeFilter) + " milliseconds.");
}
