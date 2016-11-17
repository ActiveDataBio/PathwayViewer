(function( $ ) {
  $.fn.drawHighChart = function(options) {
    var getQuantile = function(arr) {
      var sorted = arr.concat().sort(d3.ascending);
      return [d3.quantile(sorted, 0), d3.quantile(sorted, 0.25),
              d3.quantile(sorted, 0.5), d3.quantile(sorted, 0.75),
              d3.quantile(sorted, 1)];
    };
    var groupDataToArray = function(group){
      if(typeof group == "string")
        return group.split(',').map(function(d){return +d;});
      else if(Array.isArray(group))
        return group.map(function(d){return +d;});
      else 
        return group;
    }
    var getCharts = function(o) {
      var data = o.data;
      var gin = groupDataToArray(data.group_in);
      var gout = groupDataToArray(data.group_out);
      
      // common properties
      var p = {}
      p.title = {text: data.attribute};
      p.legend={enabled: false};

      p.subtitle={text: data.method + ' (p-value): ' + Number(+data.pvalue).toExponential(3)};
      p.xAxis={
              categories: ['IN', 'OUT'],
              title: {
                text: 'Group'
              }
      };
      p.yAxis={
              title: {
                text: 'Values'
              }
      };

      // for html string
      var t = '<p>';
      gin_str = data.group_in;
      gout_str = data.group_out;

      // types of charts
      if (o.chart == 'box') {
        p.chart={
                type: 'boxplot',
                renderTo: 'chart'
        };
        p.allowPointSelect=true;
        p.series=[{
          name: 'Observations',
          data: [getQuantile(gin), getQuantile(gout)],
          tooltip: {
            headerFormat: '<em>Sample No {point.key}</em><br/>'
          }
        }, {
          type: 'scatter',
          name: 'IN',
          data: gin.map(function(d) {
            return [Math.random()/2-0.25, d];
          }),
          marker: {
            radius: 3
          },
          color: 'rgba(223, 83, 83, .5)'
        }, {
          type: 'scatter',
          name: 'OUT',
          data: gout.map(function(d) {
            return [Math.random()/2+0.75, d];
          }),
          marker: {
            radius: 3
          },
          color: 'rgba(119, 152, 191, .5)'
        }];
      } else if (o.chart == 'column' 
        || o.chart == 'stacked-column' 
          || o.chart == 'percent-column') {
        t += 'LABELS: ' + data.labels + '<br>';
        gin_str = Object.keys(data.group_in).map(function(d){return d+":"+data.group_in[d];}).join();
        gout_str = Object.keys(data.group_out).map(function(d){return d+":"+data.group_out[d];}).join();
        p.chart={
                type: 'column',
                renderTo: 'chart'
        };
        p.legend={enabled: true};
        p.xAxis={
                categories: ['Selected', 'Not Selected'],
                title: {text: 'Group'}
        };
//        p.xAxis={
//                categories: data.labels.split(","),
//                title: {text: 'Labels'}
//        };
        p.yAxis={
                title: {text: o.chart == 'percent-column'?'Percent(%)':'Counts'}
        };
        if(o.chart != 'column') {
          p.plotOptions={
                  column: {stacking: o.chart == 'percent-column'?'percent':'normal'}
          };
        }
        //if labels is a string split on comma to crate an array
        var labelsArray;
        if(data.labels instanceof Array)//== "array")
          labelsArray = data.labels;
        else if(typeof data.labels == "string")
          labelsArray = data.labels.split(',');
        p.series=labelsArray.map(function(d,i){
          return {name:d, data:[gin[d] != undefined?gin[d]:gin[i],gout[d] != undefined?gout[d]:gout[i]]};
        });
//        p.series=[{
//          name: 'IN',
//          data: gin
//        }, {
//          name: 'OUT',
//          data: gout
//        }];
      } else if (o.chart == 'scatter') {
        p.chart={
                type: 'scatter',
                zoomType: 'xy'
        };
        p.allowPointSelect=true;
        p.series=[{
          name: 'IN',
          data: gin.map(function(d) {
            return [0, d];
          }),
          color: 'rgba(223, 83, 83, .5)'
        }, {
          name: 'OUT',
          data: gout.map(function(d) {
            return [1, d];
          }),
          color: 'rgba(119, 152, 191, .5)'
        }];
      } else if (o.chart == 'kaplan') {
        p.chart={
                type: 'line',
                zoomType: 'xy'
        };
        p.allowPointSelect=true;
        var _gin = gin.time.map(function(d,i){return [d,gin.prob[i]];});
        _gin.splice(0,0,[0,1]);
        var _gout = gout.time.map(function(d,i){return [d,gout.prob[i]];});
        _gout.splice(0,0,[0,1]);
        p.series=[{
          name: 'IN',
          step: 'left',
          data:_gin,
          color: 'rgba(223, 83, 83, .5)'
        }, {
          name: 'OUT',
          step: 'left',
          data:_gout,
          color: 'rgba(119, 152, 191, .5)'
        }];
      }

      t += 'GROUP IN: ' + gin_str + '<br>';
      t += 'GROUP OUT: ' + gout_str + '<br>';
      t += 'METHOD: ' + data.method + '<br>';
      t += 'p-value: ' + data.pvalue + '<br>';
      t += '</p>';

      //flatten data
      //p.series.forEach(function(d){return d.data.forEach(function(f){return f instanceof Array?f.map(function(e){return e;}):f;});});
      
      
      // create a graph
      $(o.target+' .summary').html(t);
      $(o.target+' .chart').highcharts(p);
      // event register
      $(o.target+' .summary').on('click', function(evt) {
        if (!evt.isDefaultPrevented()) {
          evt.preventDefault();
          evt.stopPropagation();
          $(this).toggleClass('collapsed');
          if ($(this).hasClass('collapsed')) {
            $(this).prop('title', 'Click to show details.');
          } else {
            $(this).prop('title', 'Click to hide details.');
          }
        }
      });
    }

    var settings = $.extend({
      width: 400,
      height: 300,
      data: null,
      metaInfo: null,
      target: null,
      type: null,
      chart: null
    }, options );

    // for pop-ups in pathway view
    if (settings.type === 'cohort') drawBarChartWithHighChart(settings.target, settings.data, settings.width, settings.height, settings.metaInfo);
    if (settings.type === 'timeline') drawLineChartWithHighChart(settings.target, settings.data, settings.width, settings.height, settings.metaInfo);
    if (settings.type === 'default') drawLineChartWithHighChart_old(settings.target, settings.data, settings.width, settings.height, settings.metaInfo);

    // in heatmap view
    if(settings.chart) getCharts(settings);
    return this;
  };

}( jQuery ));

var drawBarChartWithHighChart = function (target, data, w, h, metaInfo) {
  var groups = Object.keys(metaInfo).map(function (d){return metaInfo[d].group;});
  groups = d3.set(groups).values().sort();

  var proteins = data.map(function (d) {
    return d.refseq_id;
  });
  proteins = d3.set(proteins).values();

  var chart_data = [];
  var matColor = d3.scaleLinear()
//.domain([-1.5, 0, 1.5]) 
  .domain([-.001, .001])
//.range(["#2166AC", "#f7f7f7", "#B2182B"]);
  .range(["#0000ff", "#ff0000"]);
  var idxProtein = proteins.length;
  var f_groups = [];
  while (idxProtein--) {
    var protein = proteins[idxProtein];
    var idxGroup = groups.length;
    tempAvgData = [];
    tempErrData = [];
    var i = 0;
    while (idxGroup > i) {
      var group = groups[i];
      var samples = Object.keys(metaInfo).filter(function (d) { return metaInfo[d].group == group; });
      var rawData = data.filter(function (d) {
        return (d.refseq_id == protein) && (samples.indexOf(d.sample_id)>=0); });
      var avg = d3.mean(rawData.map(function (d) { return d.value; }));
      var err95 = d3.deviation(rawData.map(function (d) { return d.value; })) * 1.96 / Math.sqrt(rawData.length);
      //if (avg != undefined) {
      tempAvgData.push({y:avg, color:matColor(avg)});
      if (err95 != undefined && !isNaN(err95)) tempErrData.push([avg-err95, avg+err95]);
      else tempErrData.push([avg, avg]);

      //f_groups.push(group);
      //}
      i++;
    }
    if (tempAvgData.length>0) {
      chart_data.push({data:tempAvgData, name:protein, type:'column'});
      chart_data.push({data:tempErrData, name:protein+' error', type:'errorbar', tooltip: {
        pointFormat: 'error range: {point.low}~{point.high}'
      }});
    }
  }

  var chart_prop = {
          title: {
            text: null
          },
          chart: {
            zoomType: 'xy',
            width: w-20,
            height: h-40,
          },
          legend: {
            enabled: true,
            maxHeight: 160
          },
          xAxis: {
            categories: groups,
            title: {
              text: null
            }
          },
          yAxis: {
            title: {
              text: null
            }
          },
          tooltip: {
            shared: false,
            valueDecimals: 2
          },
          series: chart_data
  };

  $(target).highcharts(chart_prop);
}

var drawLineChartWithHighChart = function (target, data, w, h, metaInfo) {
  var groups = Object.keys(metaInfo).map(function (d){return metaInfo[d].group;});
  groups = d3.set(groups).values();

  var proteins = data.map(function (d) {
    return d.refseq_id;
  });
  proteins = d3.set(proteins).values();

  var idxGroup = groups.length;
  var chart_data = [];
  while (idxGroup--) {
    var group = groups[idxGroup];
    var attributes = Object.keys(metaInfo).filter(function (d) { return metaInfo[d].group == group; });
    var idxProtein = proteins.length;
    while (idxProtein--) {
      var protein = proteins[idxProtein];
      var tempData = [];
      var timelines = attributes.map(function (d) { return metaInfo[d].timeline; });
      timelines = d3.set(timelines).values();
      var len = timelines.length;
      while (len--) {
        var timeline = timelines[len];
        var rawData = data.filter(function (d) { 
          return d.refseq_id == protein && attributes.indexOf(d.sample_id)>=0 && metaInfo[d.sample_id].timeline == timeline; });	
        var avg = d3.mean(rawData.map(function (d) { return d.value; }));
        if (avg != undefined) tempData.push([+timeline, avg]);
      }
      if (tempData.length > 0) chart_data.push({data:tempData, name:protein+'_'+group, type:'spline'});
    }
  }

  var chart_prop = {
          title: {
            text: null
          },
          chart: {
            zoomType: 'xy',
            width: w-20,
            height: h-40,
          },
          legend: {
            enabled: true, 
            width: w-20,
            maxHeight: 120
          },
          xAxis: {
            //categories: categories,
            title: {
              text: null
            }
          },
          yAxis: {
            title: {
              text: null
            }
          },
          tooltip: {
            shared: false,
            valueDecimals: 2
          },
          series: chart_data
  };

  $(target).highcharts(chart_prop);
}

function updateStatGraph(nodeName, data) {
  var temp = '<p>';

  var group_in_arr = data.group_in.split(",");
  for (var i = 0; i < group_in_arr.length; i++) {
    group_in_arr[i] = +group_in_arr[i];
  }

  var group_out_arr = data.group_out.split(",");
  for (var i = 0; i < group_out_arr.length; i++) {
    group_out_arr[i] = +group_out_arr[i];
  }

  var chart_prop = {
          title: {
            text: data.attribute
          },
          legend: {
            enabled: false
          },
          chart: {
            type: 'boxplot',
            renderTo: 'chart'
          },
          allowPointSelect: true,
          subtitle: {
            text: data.method + ' (p-value): ' + data.pvalue.toExponential(5)
          },
          xAxis: {
            categories: ['IN', 'OUT'],
            title: {
              text: 'Group'
            }
          },
          yAxis: {
            title: {
              text: 'Values'
            }
          },
          series: [{
            name: 'Observations',
            data: [getQuantile(group_in_arr), getQuantile(group_out_arr)],
            tooltip: {
              headerFormat: '<em>Sample No {point.key}</em><br/>'
            }
          }, {
            type: 'scatter',
            name: 'IN',
            data: group_in_arr.map(function(d) {
              return [0, d];
            }),
            marker: {
              radius: 3
            },
            color: 'rgba(223, 83, 83, .5)'
          }, {
            type: 'scatter',
            name: 'OUT',
            data: group_out_arr.map(function(d) {
              return [1, d];
            }),
            marker: {
              radius: 3
            },
            color: 'rgba(119, 152, 191, .5)'
          }]
  };
  if (data.datatype == 'categorical') {
    chart_prop = {
            title: {
              text: data.attribute
            },
            legend: {
              enabled: true
            },
            chart: {
              type: 'column',
              renderTo: 'chart'
            },
            subtitle: {
              text: data.method + ' (p-value): ' + data.pvalue.toExponential(5)
            },
            xAxis: {
              categories: data.labels.split(","),
              title: {
                text: 'Labels'
              }
            },
            yAxis: {
              title: {
                text: 'Counts'
              }
            },
            plotOptions: {
              column: {
                stacking: 'percent'
//                stacking: 'normal'
              }
            },
            series: [{
              name: 'IN',
              data: group_in_arr

            }, {
              name: 'OUT',
              data: group_out_arr

            }]
    };
    temp += 'TYPE: Categorical<br>';
    temp += 'LABELS: ' + data.labels + '<br>';
  } else if (data.datatype == 'continuous') {
    temp += 'TYPE: Continuous<br>';
  }
  temp += 'GROUP IN: ' + data.group_in + '<br>';
  temp += 'GROUP OUT: ' + data.group_out + '<br>';
  temp += 'METHOD: ' + data.method + '<br>';
  temp += 'p-value: ' + data.pvalue + '<br>';
  temp += '</p>';
  $('#graph_stat_'+nodeName+' .summary').html(temp);
  $('#graph_stat_'+nodeName+' .chart').highcharts(chart_prop);

  $('#graph_stat_' + nodeName + ' .summary').on('click', function(evt) {
    if (!evt.isDefaultPrevented()) {
      evt.preventDefault();
      evt.stopPropagation();
      $(this).toggleClass('collapsed');
      if ($(this).hasClass('collapsed')) {
        $(this).prop('title', 'Click to show details.');
      } else {
        $(this).prop('title', 'Click to hide details.');
      }
    }
  });
}

var drawLineChartWithHighChart_old = function (target, data, w, h, metaInfo) {
  var categories = data.map(function (d) {
    var token = d.sample_id.split('_');
    return token[token.length-2];
  });
  categories = d3.set(categories).values();
  categories.sort(function (a, b) {
    if (a == 'SS') return false;
    else if (b == 'SS') return true;
    else return (+(a) > +(b));
  });

  var proteins = data.map(function (d) {
    return d.refseq_id;
  });
  proteins = d3.set(proteins).values();

  var chart_data = [];
  var data_average = [[]];
  var len = data.length;
  while (len--) {
    var _temp = data[len];
    var protein_idx = proteins.indexOf(_temp.refseq_id);
    if (chart_data[protein_idx] == undefined) {
      chart_data[protein_idx] = {};
      chart_data[protein_idx].name = _temp.refseq_id;
      chart_data[protein_idx].type = 'errorbar';
      chart_data[protein_idx].tooltip = {};
      chart_data[protein_idx].tooltip.pointFormat = '{point.low:.1f}-{point.high:.1f}<br/>';
      chart_data[protein_idx].data = [];
    }
    var category_idx = categories.indexOf(_temp.sample_id.split('_')[3]);
    if (chart_data[protein_idx].data[category_idx] == undefined) {
      chart_data[protein_idx].data[category_idx] = [_temp.value, _temp.value];
    } else {
      var sub = chart_data[protein_idx].data[category_idx];
      if(_temp.value < sub[0]) sub[0] = _temp.value;
      else if(_temp.value > sub[1]) sub[1] = _temp.value;
    }
    if (data_average[protein_idx] == undefined) data_average[protein_idx] = [];
    if (data_average[protein_idx][category_idx] == undefined) {
      data_average[protein_idx][category_idx] = {};
      data_average[protein_idx][category_idx].sum = _temp.value;
      data_average[protein_idx][category_idx].num = 1;
    } else {
      data_average[protein_idx][category_idx].sum += _temp.value;
      data_average[protein_idx][category_idx].num += 1;
    }
  }
  var len = data_average.length;
  while (len--) {
    var idx = proteins.length+len;
    chart_data[idx] = {};
    chart_data[idx].name = chart_data[len].name+'_line';
    chart_data[idx].type = 'spline';
    chart_data[idx].tooltip = {};
    chart_data[idx].tooltip.pointFormat = '<span style="font-weight: bold; color: {series.color}">{series.name}</span>: <b>{point.y:.1f}</b> ';
    chart_data[idx].data = data_average[len].map(function (d) { return d.sum / d.num; });
  }

  var chart_prop = {
          title: {
            text: null
          },
          chart: {
            zoomType: 'xy',
            width: w-20,
            height: h-40,
          },
          legend: {
            enabled: false
          },
          xAxis: {
            categories: categories,
            title: {
              text: null
            }
          },
          yAxis: {
            title: {
              text: null
            }
          },
          tooltip: {
            shared: false,
            valueDecimals: 2
          },
          series: chart_data
  };

  $(target).highcharts(chart_prop);
}